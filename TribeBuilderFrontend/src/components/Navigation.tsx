import { Link, useLocation } from 'react-router-dom';
import { Music, User, Upload, Sparkles, Image, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
const Navigation = () => {
  const location = useLocation();
  const navItems = [{
    path: '/',
    label: 'Dashboard',
    icon: Sparkles
  }, {
    path: '/persona',
    label: 'Persona Form',
    icon: User
  }, {
    path: '/media',
    label: 'Media Upload',
    icon: Upload
  }, {
    path: '/image-editor',
    label: 'Image Editor',
    icon: Image
  }, {
    path: '/video-editor',
    label: 'Video Editor',
    icon: Video
  }];
  return <nav className="bg-gradient-card shadow-card border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-primary p-2 rounded-lg shadow-glow">
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">TribeBuilder</h1>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map(({
            path,
            label,
            icon: Icon
          }) => <Link key={path} to={path} className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300", "hover:bg-primary/10 hover:shadow-card hover:scale-105", location.pathname === path ? "bg-primary text-primary-foreground shadow-creative" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
              </Link>)}
          </div>
        </div>
      </div>
    </nav>;
};
export default Navigation;