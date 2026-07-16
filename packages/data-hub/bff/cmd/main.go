package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/briangallagher/odh-dashboard/packages/data-hub/bff/internal/api"
	"github.com/briangallagher/odh-dashboard/packages/data-hub/bff/internal/config"
	"github.com/briangallagher/odh-dashboard/packages/data-hub/bff/internal/integrations/feast"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.Load()
	catalog := feast.NewCatalogClient()
	app := api.NewApp(catalog)

	mux := http.NewServeMux()
	app.RegisterRoutes(mux)

	slog.Info("starting data-hub BFF",
		"port", cfg.Port,
		"catalog_url", cfg.CatalogAPIURL,
	)

	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
