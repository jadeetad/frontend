// Feature registry: the sidebar and routes are built from this list.
// To add a module, add one line. `page` names a built screen; without it a placeholder shows.
const ALL = ['customer', 'service_employee', 'reviewer', 'admin'];
const STAFF = ['service_employee', 'reviewer', 'admin'];
export const FEATURES = [
  { id: 'profile', label: 'Profile', route: '/profile', roles: ALL, group: 'My account', endpoint: 'GET /profile' },
  { id: 'notifications', label: 'Notifications', route: '/notifications', roles: ALL, group: 'My account', endpoint: 'GET /notifications' },
  { id: 'products', label: 'Products', route: '/products', roles: ALL, group: 'Products and warranties', endpoint: 'GET /products' },
  { id: 'warranties', label: 'Warranties', route: '/warranties', roles: ALL, group: 'Products and warranties', endpoint: 'GET /warranties' },
  { id: 'repairs', label: 'Repair history', route: '/repairs', roles: ALL, group: 'Products and warranties', endpoint: 'GET /products/:id/repairs' },
  { id: 'documents', label: 'Documents', route: '/documents', roles: ALL, group: 'Documents', endpoint: 'POST /documents/upload' },
  { id: 'claims', label: 'All claims', route: '/claims', roles: ALL, group: 'Claims', page: 'claims' },
  { id: 'new', label: 'New claim', route: '/claims/new', roles: ['customer', 'service_employee'], group: 'Claims', page: 'new' },
  { id: 'status', label: 'Claim status', route: '/claims/:id/status', roles: ALL, group: 'Claims', page: 'status', hidden: true },
  { id: 'result', label: 'AI analysis', route: '/claims/:id/result', roles: ALL, group: 'Claims', page: 'result', hidden: true },
  { id: 'review', label: 'Review queue', route: '/review', roles: ['reviewer', 'admin'], group: 'Review', page: 'review' },
  { id: 'admin', label: 'Dashboard', route: '/admin', roles: ['admin'], group: 'Admin', page: 'admin' },
  { id: 'analytics', label: 'Analytics', route: '/admin/analytics', roles: ['admin'], group: 'Admin', endpoint: 'GET /admin/analytics' },
  { id: 'policies', label: 'Warranty policies', route: '/admin/policies', roles: ['admin'], group: 'Admin', endpoint: 'GET /admin/policies/:category' },
  { id: 'settings', label: 'Thresholds', route: '/admin/settings', roles: ['admin'], group: 'Admin', endpoint: 'GET /admin/settings' },
  { id: 'audit', label: 'Audit trail', route: '/admin/audit', roles: ['admin'], group: 'Admin', endpoint: 'GET /admin/audit' },
  { id: 'alerts', label: 'Alerts', route: '/admin/alerts', roles: ['admin'], group: 'Admin', endpoint: 'GET /admin/alerts' },
  { id: 'export', label: 'Export data', route: '/admin/export', roles: ['admin'], group: 'Admin', endpoint: 'GET /admin/export?type=' },
];
