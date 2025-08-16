import { useState, useEffect, useRef } from 'react';
import { MapPin, AlertTriangle, Clock, Users, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import 'leaflet/dist/leaflet.css';

interface Alert {
  id: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: Date;
  severity: 'high' | 'medium' | 'low' | 'critical';
  status: 'active' | 'responding' | 'resolved';
  type: 'scream' | 'distress_call' | 'suspicious_activity';
  responders: number;
}

const AlertMap = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'high'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Location access denied or unavailable');
          console.error('Geolocation error:', error);
          // Fallback to default location
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      setLocationError('Geolocation not supported');
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current && userLocation) {
      import('leaflet').then((L) => {
        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        leafletMapRef.current = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMapRef.current);

        // Add user location marker
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: -2px; left: -2px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #3b82f6; opacity: 0.3; animation: pulse 2s infinite;"></div></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(leafletMapRef.current)
          .bindPopup('📍 Your Location');

        // Add alerts relative to user location (within ~5km radius)
        const alertMarkers = [
          { 
            lat: userLocation.lat + 0.01, 
            lng: userLocation.lng + 0.02, 
            title: 'Local Area - High Priority', 
            color: 'red' 
          },
          { 
            lat: userLocation.lat - 0.015, 
            lng: userLocation.lng + 0.01, 
            title: 'Shopping Center - Medium Priority', 
            color: 'orange' 
          },
          { 
            lat: userLocation.lat + 0.005, 
            lng: userLocation.lng - 0.025, 
            title: 'Residential Area - Resolved', 
            color: 'green' 
          },
          { 
            lat: userLocation.lat - 0.008, 
            lng: userLocation.lng - 0.012, 
            title: 'Downtown - Critical', 
            color: 'darkred' 
          },
        ];

        alertMarkers.forEach(marker => {
          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${marker.color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          L.marker([marker.lat, marker.lng], { icon })
            .addTo(leafletMapRef.current)
            .bindPopup(marker.title);
        });
      });
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [userLocation]);

  // Mock data for demonstration - based on user location
  useEffect(() => {
    if (!userLocation) return;
    
    const mockAlerts: Alert[] = [
      {
        id: '1',
        location: {
          lat: userLocation.lat + 0.01,
          lng: userLocation.lng + 0.02,
          address: 'Local Shopping Plaza'
        },
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        severity: 'high',
        status: 'active',
        type: 'scream',
        responders: 3
      },
      {
        id: '2',
        location: {
          lat: userLocation.lat - 0.015,
          lng: userLocation.lng + 0.01,
          address: 'Downtown Shopping Center'
        },
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        severity: 'medium',
        status: 'responding',
        type: 'distress_call',
        responders: 2
      },
      {
        id: '3',
        location: {
          lat: userLocation.lat + 0.005,
          lng: userLocation.lng - 0.025,
          address: 'Residential Area'
        },
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        severity: 'low',
        status: 'resolved',
        type: 'suspicious_activity',
        responders: 1
      },
      {
        id: '4',
        location: {
          lat: userLocation.lat - 0.008,
          lng: userLocation.lng - 0.012,
          address: 'City Center'
        },
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        severity: 'critical',
        status: 'active',
        type: 'scream',
        responders: 5
      }
    ];
    setAlerts(mockAlerts);
  }, [userLocation]);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return alert.status === 'active';
    if (filter === 'high') return alert.severity === 'high' || alert.severity === 'critical';
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground animate-pulse';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-destructive text-destructive-foreground';
      case 'responding': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Real Map */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Live Alert Map (OpenStreetMap)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="high">High Severity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="h-96 w-full rounded-lg border bg-muted" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Free OpenStreetMap showing {filteredAlerts.length} alerts • Red: Critical/High, Orange: Medium, Green: Resolved
          </p>
        </CardContent>
      </Card>

      {/* Alert Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">
              {alerts.filter(a => a.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">Active Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">
              {alerts.filter(a => a.status === 'responding').length}
            </div>
            <p className="text-sm text-muted-foreground">Responding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              {alerts.filter(a => a.status === 'resolved').length}
            </div>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {alerts.reduce((sum, a) => sum + a.responders, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Responders</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedAlert?.id === alert.id ? 'ring-2 ring-primary' : ''
                } ${alert.severity === 'critical' ? 'border-destructive bg-destructive/5' : ''}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium capitalize">
                      {alert.type.replace('_', ' ')}
                    </span>
                    {alert.severity === 'critical' && (
                      <span className="text-destructive font-semibold text-sm">🚨 CRITICAL</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Badge className={getStatusColor(alert.status)}>
                      {alert.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {alert.location.address}
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {alert.responders} responders
                    </span>
                  </div>
                  {alert.status === 'active' && (
                    <Button size="sm" variant="outline">
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Details */}
      {selectedAlert && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Location</h4>
                <p className="text-sm text-muted-foreground">{selectedAlert.location.address}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedAlert.location.lat.toFixed(4)}, {selectedAlert.location.lng.toFixed(4)}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <p className="text-sm text-muted-foreground">
                  Reported: {selectedAlert.timestamp.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatTimeAgo(selectedAlert.timestamp)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline">View Details</Button>
              <Button variant="outline">Contact Responders</Button>
              {selectedAlert.status === 'active' && (
                <Button className="bg-primary hover:bg-primary/90">
                  Join Response
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlertMap;