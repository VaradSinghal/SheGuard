import { useState } from 'react';
import { Shield, AlertTriangle, MapPin, Users, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceDetection from '@/components/VoiceDetection';
import AlertMap from '@/components/AlertMap';
import CommunityAlerts from '@/components/CommunityAlerts';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'voice' | 'map' | 'community'>('voice');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="container mx-auto text-center relative z-10">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SheGuard
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered voice detection system that identifies distress signals and alerts the community to ensure women's safety
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => setActiveTab('voice')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Voice Detection
            </Button>
            <Button 
              onClick={() => setActiveTab('map')}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <MapPin className="h-5 w-5 mr-2" />
              View Alert Map
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How SheGuard Protects</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Mic className="h-10 w-10 text-primary mb-4" />
                <CardTitle>AI Voice Detection</CardTitle>
                <CardDescription>
                  Advanced AI algorithms detect screams and distress signals in real-time
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <MapPin className="h-10 w-10 text-accent mb-4" />
                <CardTitle>Location Mapping</CardTitle>
                <CardDescription>
                  Alerts are instantly mapped with precise location data for quick response
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-success mb-4" />
                <CardTitle>Community Network</CardTitle>
                <CardDescription>
                  Connect with nearby community members and emergency responders
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Interface */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-muted rounded-lg p-1 flex">
              <Button
                variant={activeTab === 'voice' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('voice')}
                className="rounded-md"
              >
                <Mic className="h-4 w-4 mr-2" />
                Voice Detection
              </Button>
              <Button
                variant={activeTab === 'map' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('map')}
                className="rounded-md"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Alert Map
              </Button>
              <Button
                variant={activeTab === 'community' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('community')}
                className="rounded-md"
              >
                <Users className="h-4 w-4 mr-2" />
                Community
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            {activeTab === 'voice' && <VoiceDetection />}
            {activeTab === 'map' && <AlertMap />}
            {activeTab === 'community' && <CommunityAlerts />}
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-12 px-4 bg-destructive/10 border-t-2 border-destructive/20">
        <div className="container mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-destructive mb-2">Emergency Contact</h3>
          <p className="text-muted-foreground mb-4">
            In case of immediate danger, contact emergency services
          </p>
          <Button 
            variant="destructive" 
            size="lg"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Call 911
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
