package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	authorizationv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const (
	ssarCacheTTL    = 30 * time.Second
	ssarGroup       = "datacatalog.opendatahub.io"
	ssarResource    = "tables"
	ssarVerb        = "list"
)

type cacheEntry struct {
	namespaces []string
	expiresAt  time.Time
}

type NamespaceChecker struct {
	mu    sync.RWMutex
	cache map[string]cacheEntry
}

func NewNamespaceChecker() *NamespaceChecker {
	return &NamespaceChecker{
		cache: make(map[string]cacheEntry),
	}
}

// AccessibleNamespaces returns the namespaces where the user has
// datacatalog.opendatahub.io/tables:list permission.
// It first lists all namespaces visible to the user, then performs a
// batch SSAR check against each one, caching results per token.
func (nc *NamespaceChecker) AccessibleNamespaces(ctx context.Context, token string) ([]string, error) {
	nc.mu.RLock()
	if entry, ok := nc.cache[token]; ok && time.Now().Before(entry.expiresAt) {
		nc.mu.RUnlock()
		return entry.namespaces, nil
	}
	nc.mu.RUnlock()

	cfg := &rest.Config{
		Host:        "https://kubernetes.default.svc",
		BearerToken: token,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: false,
			CAFile:   "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
		},
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("creating kubernetes client: %w", err)
	}

	nsList, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("listing namespaces: %w", err)
	}

	var accessible []string
	for _, ns := range nsList.Items {
		allowed, err := nc.checkSSAR(ctx, clientset, ns.Name)
		if err != nil {
			slog.Warn("SSAR check failed",
				"namespace", ns.Name,
				"error", err,
			)
			continue
		}
		if allowed {
			accessible = append(accessible, ns.Name)
		}
	}

	nc.mu.Lock()
	nc.cache[token] = cacheEntry{
		namespaces: accessible,
		expiresAt:  time.Now().Add(ssarCacheTTL),
	}
	nc.mu.Unlock()

	slog.Info("namespace access check complete",
		"total", len(nsList.Items),
		"accessible", len(accessible),
	)

	return accessible, nil
}

func (nc *NamespaceChecker) checkSSAR(ctx context.Context, clientset kubernetes.Interface, namespace string) (bool, error) {
	review := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Namespace: namespace,
				Verb:      ssarVerb,
				Group:     ssarGroup,
				Resource:  ssarResource,
			},
		},
	}

	result, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, review, metav1.CreateOptions{})
	if err != nil {
		return false, fmt.Errorf("SSAR request: %w", err)
	}

	return result.Status.Allowed, nil
}

// namespacesResponse is the JSON envelope returned by the namespaces endpoint.
type namespacesResponse struct {
	Namespaces []string `json:"namespaces"`
}

func marshalNamespaces(namespaces []string) ([]byte, error) {
	return json.Marshal(namespacesResponse{Namespaces: namespaces})
}

// DataConnectionInfo represents a K8s Data Connection Secret.
type DataConnectionInfo struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace"`
	DisplayName    string `json:"displayName"`
	ConnectionType string `json:"connectionType"`
	Endpoint       string `json:"endpoint"`
	Bucket         string `json:"bucket"`
	Region         string `json:"region"`
	LinkedTables   int    `json:"linkedTables"`
}

// ListDataConnections returns Data Connection secrets in the given namespace.
func (nc *NamespaceChecker) ListDataConnections(ctx context.Context, token, namespace string) ([]DataConnectionInfo, error) {
	cfg, err := nc.restConfigForToken(token)
	if err != nil {
		return nil, err
	}
	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("creating clientset: %w", err)
	}

	secrets, err := clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "opendatahub.io/managed=true,opendatahub.io/dashboard=true",
	})
	if err != nil {
		return nil, fmt.Errorf("listing secrets in %s: %w", namespace, err)
	}

	var connections []DataConnectionInfo
	for _, s := range secrets.Items {
		connType := s.Annotations["opendatahub.io/connection-type-ref"]
		if connType == "" {
			connType = "s3"
		}
		displayName := s.Annotations["openshift.io/display-name"]
		if displayName == "" {
			displayName = s.Name
		}

		conn := DataConnectionInfo{
			Name:           s.Name,
			Namespace:      namespace,
			DisplayName:    displayName,
			ConnectionType: connType,
			Endpoint:       string(s.Data["AWS_S3_ENDPOINT"]),
			Bucket:         string(s.Data["AWS_S3_BUCKET"]),
			Region:         string(s.Data["AWS_DEFAULT_REGION"]),
		}
		connections = append(connections, conn)
	}

	return connections, nil
}

func (nc *NamespaceChecker) restConfigForToken(token string) (*rest.Config, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		cfg = &rest.Config{Host: "https://kubernetes.default.svc"}
	}
	cfg.BearerToken = token
	cfg.BearerTokenFile = ""
	return cfg, nil
}
