package feast

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"
)

type CatalogClient struct {
	BaseURL string
	Client  *http.Client
}

func NewCatalogClient() *CatalogClient {
	baseURL := os.Getenv("CATALOG_API_URL")
	if baseURL == "" {
		baseURL = "http://feast-catalog.redhat-ods-applications.svc:6572"
	}

	return &CatalogClient{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ListNamespaces returns the namespaces (catalogs) available for a given prefix.
func (c *CatalogClient) ListNamespaces(ctx context.Context, prefix, token string) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces", c.BaseURL, prefix)
	return c.doGet(ctx, url, token)
}

// ListTables returns the tables within a namespace.
func (c *CatalogClient) ListTables(ctx context.Context, prefix, namespace, token string) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces/%s/tables", c.BaseURL, prefix, namespace)
	return c.doGet(ctx, url, token)
}

// LoadTable returns the detail for a single table.
func (c *CatalogClient) LoadTable(ctx context.Context, prefix, namespace, table, token string) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces/%s/tables/%s", c.BaseURL, prefix, namespace, table)
	return c.doGet(ctx, url, token)
}

// ListVolumes returns the volumes within a namespace.
func (c *CatalogClient) ListVolumes(ctx context.Context, prefix, namespace, token string) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces/%s/volumes", c.BaseURL, prefix, namespace)
	return c.doGet(ctx, url, token)
}

// GetVolume returns the detail for a single volume.
func (c *CatalogClient) GetVolume(ctx context.Context, prefix, namespace, volume, token string) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces/%s/volumes/%s", c.BaseURL, prefix, namespace, volume)
	return c.doGet(ctx, url, token)
}

// Search performs a full-text search across namespaces.
func (c *CatalogClient) Search(ctx context.Context, prefix, query, token string) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/search?query=%s", c.BaseURL, prefix, query)
	return c.doGet(ctx, url, token)
}

// CreateTable proxies a table creation request to the catalog API.
func (c *CatalogClient) CreateTable(ctx context.Context, prefix, namespace, token string, body []byte) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces/%s/tables", c.BaseURL, prefix, namespace)
	return c.doPost(ctx, url, token, body)
}

// CreateVolume proxies a volume creation request to the catalog API.
func (c *CatalogClient) CreateVolume(ctx context.Context, prefix, namespace, token string, body []byte) ([]byte, error) {
	url := fmt.Sprintf("%s/v1/%s/namespaces/%s/volumes", c.BaseURL, prefix, namespace)
	return c.doPost(ctx, url, token, body)
}

func (c *CatalogClient) doGet(ctx context.Context, url, token string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	return c.execute(req)
}

func (c *CatalogClient) doPost(ctx context.Context, url, token string, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	return c.execute(req)
}

func (c *CatalogClient) execute(req *http.Request) ([]byte, error) {
	slog.Debug("catalog request", "method", req.Method, "url", req.URL.String())

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("catalog request failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		slog.Warn("catalog returned error",
			"status", resp.StatusCode,
			"url", req.URL.String(),
			"body", string(data),
		)
		return nil, &CatalogError{StatusCode: resp.StatusCode, Body: data}
	}

	return data, nil
}

type CatalogError struct {
	StatusCode int
	Body       []byte
}

func (e *CatalogError) Error() string {
	return fmt.Sprintf("catalog API error: status %d", e.StatusCode)
}

