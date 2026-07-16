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
