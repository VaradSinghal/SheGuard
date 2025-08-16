import { useState, useEffect } from 'react';
import { Users, MessageCircle, Heart, MapPin, Clock, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';

interface CommunityMember {
  id: string;
  name: string;
  role: 'responder' | 'member' | 'moderator';
  distance: number;
  isOnline: boolean;
  responseTime: string;
  helpCount: number;
}

interface CommunityAlert {
  id: string;
  author: string;
  message: string;
  timestamp: Date;
  location: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  responses: number;
  isResolved: boolean;
}

const CommunityAlerts = () => {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [newAlert, setNewAlert] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [emergencyContacts, setEmergencyContacts] = useState({
    email: '',
    phone: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    // Mock community members
    const mockMembers: CommunityMember[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        role: 'responder',
        distance: 0.3,
        isOnline: true,
        responseTime: '< 2 min',
        helpCount: 15
      },
      {
        id: '2',
        name: 'Emily Chen',
        role: 'moderator',
        distance: 0.7,
        isOnline: true,
        responseTime: '< 5 min',
        helpCount: 32
      },
      {
        id: '3',
        name: 'Maria Rodriguez',
        role: 'member',
        distance: 1.2,
        isOnline: false,
        responseTime: '< 10 min',
        helpCount: 8
      },
      {
        id: '4',
        name: 'Jessica Kim',
        role: 'responder',
        distance: 1.5,
        isOnline: true,
        responseTime: '< 3 min',
        helpCount: 21
      }
    ];

    // Mock community alerts
    const mockAlerts: CommunityAlert[] = [
      {
        id: '1',
        author: 'Anonymous',
        message: 'Feeling unsafe walking alone near Central Park area. Anyone nearby who could walk with me?',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        location: 'Central Park West',
        urgency: 'medium',
        responses: 3,
        isResolved: false
      },
      {
        id: '2',
        author: 'Lisa M.',
        message: 'Suspicious person following me on 42nd Street. Could use some help.',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        location: '42nd Street',
        urgency: 'high',
        responses: 5,
        isResolved: true
      },
      {
        id: '3',
        author: 'Alex P.',
        message: 'Looking for a safety buddy for evening jog around the neighborhood.',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        location: 'Brooklyn Heights',
        urgency: 'low',
        responses: 2,
        isResolved: false
      }
    ];

    setMembers(mockMembers);
    setAlerts(mockAlerts);

    // Listen for new alerts from voice detection
    const handleNewAlert = (event: CustomEvent) => {
      const newAlert = {
        id: Date.now().toString(),
        ...event.detail,
        responses: 0,
        isResolved: false,
      };
      setAlerts(prev => [newAlert, ...prev]);
      
      // Show notification for emergency alerts
      if (event.detail.urgency === 'critical' || event.detail.urgency === 'high') {
        toast({
          title: "🚨 Emergency Alert Received",
          description: event.detail.message,
          variant: "destructive",
        });
      }
    };

    window.addEventListener('new-alert', handleNewAlert as EventListener);
    return () => window.removeEventListener('new-alert', handleNewAlert as EventListener);
  }, [toast]);

  const handleSendAlert = () => {
    if (!newAlert.trim()) return;

    const alert: CommunityAlert = {
      id: Date.now().toString(),
      author: 'You',
      message: newAlert,
      timestamp: new Date(),
      location: 'Current Location',
      urgency: selectedUrgency,
      responses: 0,
      isResolved: false
    };

    setAlerts(prev => [alert, ...prev]);
    setNewAlert('');

    toast({
      title: "Alert Sent",
      description: "Your message has been shared with the community.",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'responder': return 'bg-success text-success-foreground';
      case 'moderator': return 'bg-primary text-primary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-destructive text-destructive-foreground animate-pulse';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
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
    return `${diffHours}h ago`;
  };

  const saveEmergencyContacts = () => {
    toast({
      title: "Emergency Contacts Saved",
      description: "Your emergency contacts have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Community Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {members.filter(m => m.isOnline).length}
            </div>
            <p className="text-sm text-muted-foreground">Online Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              {members.filter(m => m.role === 'responder').length}
            </div>
            <p className="text-sm text-muted-foreground">Responders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">
              {alerts.filter(a => !a.isResolved).length}
            </div>
            <p className="text-sm text-muted-foreground">Active Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-accent">
              {members.reduce((sum, m) => sum + m.helpCount, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Helps</p>
          </CardContent>
        </Card>
      </div>

      {/* Send Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send Community Alert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe your situation or request for help..."
            value={newAlert}
            onChange={(e) => setNewAlert(e.target.value)}
            className="min-h-20"
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={selectedUrgency === 'low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUrgency('low')}
                className={selectedUrgency === 'low' ? 'bg-success hover:bg-success/90' : ''}
              >
                Low
              </Button>
              <Button
                variant={selectedUrgency === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUrgency('medium')}
                className={selectedUrgency === 'medium' ? 'bg-warning hover:bg-warning/90' : ''}
              >
                Medium
              </Button>
              <Button
                variant={selectedUrgency === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUrgency('high')}
                className={selectedUrgency === 'high' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                High
              </Button>
            </div>
            <Button onClick={handleSendAlert} disabled={!newAlert.trim()}>
              Send Alert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Community Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nearby Community Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {member.distance}km away
                      <Clock className="h-3 w-3 ml-2" />
                      {member.responseTime}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(member.role)}>
                    {member.role}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    <Heart className="h-3 w-3 inline mr-1" />
                    {member.helpCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Community Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Community Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${alert.isResolved ? 'opacity-60' : ''} ${
                  alert.urgency === 'critical' ? 'border-destructive bg-destructive/5' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.author}</span>
                    {alert.isResolved && (
                      <Badge variant="outline" className="text-xs">Resolved</Badge>
                    )}
                    {alert.urgency === 'critical' && (
                      <span className="text-destructive font-semibold text-sm">🚨 EMERGENCY</span>
                    )}
                  </div>
                  <Badge className={getUrgencyColor(alert.urgency)}>
                    {alert.urgency}
                  </Badge>
                </div>
                
                <p className="text-sm mb-3">{alert.message}</p>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {alert.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {alert.responses} responses
                    </span>
                  </div>
                  {!alert.isResolved && (
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

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Emergency Email
              </label>
              <Input
                type="email"
                placeholder="emergency@example.com"
                value={emergencyContacts.email}
                onChange={(e) => setEmergencyContacts(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Phone
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={emergencyContacts.phone}
                onChange={(e) => setEmergencyContacts(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={saveEmergencyContacts} className="w-full">
            Save Emergency Contacts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityAlerts;