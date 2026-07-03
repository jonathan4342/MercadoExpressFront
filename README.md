# MercadoExpress — Frontend Angular

SPA en **Angular 18+ (standalone components) + Angular Material**.

## Cómo usar este scaffolding

```bash
ng new mercadoexpress-front --style=scss --routing --standalone
cd mercadoexpress-front
ng add @angular/material        # tema: Indigo/Pink o Azure/Blue
# Copiar el contenido de src/ de este scaffolding sobre el src/ generado
npm start                       # http://localhost:4200 (API en localhost:3000)
```

## Estructura

```
src/app/
├── core/
│   ├── models/    # Interfaces espejo de la API (Product, Alert, PurchaseOrder...)
│   └── services/  # ProductService, AlertService, OrderService (HttpClient)
└── features/
    ├── inventory/ # Tabla con filtros RF-06 + diálogos de producto y ajuste de stock
    ├── alerts/    # Listado de alertas + generar orden desde alerta activa
    └── orders/    # Ciclo de vida de órdenes: aprobar / rechazar / recibir
```

## Vistas

- **Inventario**: tarjetas resumen (total productos, alertas activas, órdenes pendientes), filtros por categoría/proveedor/alerta/rango de stock, tabla con badge de stock bajo, acciones de ajustar stock y nuevo producto.
- **Alertas**: tabla con estado ACTIVA/RESUELTA y botón "Generar orden" (precarga cantidad = 2x stock mínimo).
- **Órdenes**: tabla con chips de estado y acciones según transición válida (Regla 5).
