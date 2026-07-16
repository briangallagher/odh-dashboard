package api

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/briangallagher/odh-dashboard/packages/data-hub/bff/internal/integrations/feast"
)

const (
	catalogPrefix       = "feast"
	tokenHeader         = "X-Forwarded-Access-Token"
	apiPrefix           = "/api/v1/"
)

// App holds dependencies shared across all handlers.
type App struct {
	catalog  *feast.CatalogClient
	nsCheck  *NamespaceChecker
}

func NewApp(catalog *feast.CatalogClient) *App {
	return &App{
		catalog: catalog,
		nsCheck: NewNamespaceChecker(),
	}
}

// RegisterRoutes wires all API endpoints onto the given mux.
func (a *App) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET "+apiPrefix+"health", a.handleHealth)
	mux.HandleFunc("GET "+apiPrefix+"namespaces", a.handleListNamespaces)
	mux.HandleFunc("GET "+apiPrefix+"collections", a.handleListCollections)
	mux.HandleFunc("GET "+apiPrefix+"collections/{ns}/{collection}/tables", a.handleListTables)
	mux.HandleFunc("GET "+apiPrefix+"collections/{ns}/{collection}/tables/{name}", a.handleGetTable)
	mux.HandleFunc("GET "+apiPrefix+"collections/{ns}/{collection}/volumes", a.handleListVolumes)
	mux.HandleFunc("GET "+apiPrefix+"collections/{ns}/{collection}/volumes/{name}", a.handleGetVolume)
	mux.HandleFunc("GET "+apiPrefix+"search", a.handleSearch)
	mux.HandleFunc("POST "+apiPrefix+"collections/{ns}/{collection}/tables", a.handleCreateTable)
	mux.HandleFunc("POST "+apiPrefix+"collections/{ns}/{collection}/volumes", a.handleCreateVolume)
	mux.HandleFunc("GET "+apiPrefix+"connections", a.handleListConnections)
}

// --- Handlers ---

func (a *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *App) handleListNamespaces(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	namespaces, err := a.nsCheck.AccessibleNamespaces(r.Context(), token)
	if err != nil {
		slog.Error("namespace check failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to check namespace access")
		return
	}

	data, err := marshalNamespaces(namespaces)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to marshal response")
		return
	}
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleListCollections(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	namespaces, err := a.nsCheck.AccessibleNamespaces(r.Context(), token)
	if err != nil {
		slog.Error("namespace check failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to check namespace access")
		return
	}

	data, err := a.catalog.ListNamespaces(r.Context(), catalogPrefix, token)
	if err != nil {
		handleCatalogError(w, err)
		return
	}

	_ = namespaces // filtering by accessible namespaces applied server-side via token
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleListTables(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	ns := r.PathValue("ns")
	collection := r.PathValue("collection")
	namespace := buildNamespace(ns, collection)

	data, err := a.catalog.ListTables(r.Context(), catalogPrefix, namespace, token)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleGetTable(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	ns := r.PathValue("ns")
	collection := r.PathValue("collection")
	name := r.PathValue("name")
	namespace := buildNamespace(ns, collection)

	data, err := a.catalog.LoadTable(r.Context(), catalogPrefix, namespace, name, token)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleListVolumes(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	ns := r.PathValue("ns")
	collection := r.PathValue("collection")
	namespace := buildNamespace(ns, collection)

	data, err := a.catalog.ListVolumes(r.Context(), catalogPrefix, namespace, token)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleGetVolume(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	ns := r.PathValue("ns")
	collection := r.PathValue("collection")
	name := r.PathValue("name")
	namespace := buildNamespace(ns, collection)

	data, err := a.catalog.GetVolume(r.Context(), catalogPrefix, namespace, name, token)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleSearch(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	query := r.URL.Query().Get("query")
	if query == "" {
		writeError(w, http.StatusBadRequest, "query parameter is required")
		return
	}

	data, err := a.catalog.Search(r.Context(), catalogPrefix, query, token)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusOK, data)
}

func (a *App) handleCreateTable(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	ns := r.PathValue("ns")
	collection := r.PathValue("collection")
	namespace := buildNamespace(ns, collection)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}
	defer r.Body.Close()

	data, err := a.catalog.CreateTable(r.Context(), catalogPrefix, namespace, token, body)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusCreated, data)
}

func (a *App) handleCreateVolume(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(w, r)
	if !ok {
		return
	}

	ns := r.PathValue("ns")
	collection := r.PathValue("collection")
	namespace := buildNamespace(ns, collection)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}
	defer r.Body.Close()

	data, err := a.catalog.CreateVolume(r.Context(), catalogPrefix, namespace, token, body)
	if err != nil {
		handleCatalogError(w, err)
		return
	}
	writeRawJSON(w, http.StatusCreated, data)
}

// --- Helpers ---

// buildNamespace maps the BFF's {ns}/{collection} path segments to the
// Iceberg REST catalog namespace, which is a dot-separated multipart identifier.
func buildNamespace(ns, collection string) string {
	return ns + "." + collection
}

func extractToken(w http.ResponseWriter, r *http.Request) (string, bool) {
	token := r.Header.Get(tokenHeader)
	if token == "" {
		token = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	if token == "" {
		writeError(w, http.StatusUnauthorized, "missing access token")
		return "", false
	}
	return token, true
}

func (a *App) handleListConnections(w http.ResponseWriter, r *http.Request) {
	token, ok := extractToken(r)
	if !ok {
		return
	}

	namespace := r.URL.Query().Get("namespace")

	namespaces, err := a.nsCheck.AccessibleNamespaces(r.Context(), token)
	if err != nil {
		slog.Error("failed to list accessible namespaces for connections", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to determine accessible namespaces")
		return
	}

	type connection struct {
		Name           string `json:"name"`
		Namespace      string `json:"namespace"`
		DisplayName    string `json:"displayName"`
		ConnectionType string `json:"connectionType"`
		Endpoint       string `json:"endpoint"`
		Bucket         string `json:"bucket"`
		Region         string `json:"region"`
		LinkedTables   int    `json:"linkedTables"`
	}

	var connections []connection
	for _, ns := range namespaces {
		if namespace != "" && ns != namespace {
			continue
		}
		secrets, err := a.nsCheck.ListDataConnections(r.Context(), token, ns)
		if err != nil {
			slog.Warn("failed to list connections", "namespace", ns, "error", err)
			continue
		}
		connections = append(connections, secrets...)
	}

	if connections == nil {
		connections = []connection{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"connections": connections,
	})
}

func handleCatalogError(w http.ResponseWriter, err error) {
	var catErr *feast.CatalogError
	if errors.As(err, &catErr) {
		writeRawJSON(w, catErr.StatusCode, catErr.Body)
		return
	}
	slog.Error("catalog request failed", "error", err)
	writeError(w, http.StatusBadGateway, "catalog service unavailable")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to write JSON response", "error", err)
	}
}

func writeRawJSON(w http.ResponseWriter, status int, data []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if _, err := w.Write(data); err != nil {
		slog.Error("failed to write response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
