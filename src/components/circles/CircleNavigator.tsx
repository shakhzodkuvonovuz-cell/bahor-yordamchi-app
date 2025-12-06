import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, UserPlus, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Circle {
  id: string;
  name: string;
  template: string;
  memberCount: number;
}

interface CircleNavigatorProps {
  currentCircleId: string;
  pendingRequestsCount?: number;
  membersCount?: number;
  onShowMembers?: () => void;
  onShowRequests?: () => void;
  onCreateCircle?: () => void;
  className?: string;
}

export function CircleNavigator({
  currentCircleId,
  pendingRequestsCount = 0,
  membersCount = 0,
  onShowMembers,
  onShowRequests,
  onCreateCircle,
  className,
}: CircleNavigatorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCircles = async () => {
      if (!user) return;
      
      try {
        const { data: memberships } = await supabase
          .from("space_members")
          .select("space_id")
          .eq("user_id", user.id)
          .eq("status", "active");

        if (!memberships?.length) {
          setCircles([]);
          setLoading(false);
          return;
        }

        const circleIds = memberships.map((m) => m.space_id);

        const { data: circleData } = await supabase
          .from("spaces")
          .select("id, name, template")
          .in("id", circleIds);

        const { data: counts } = await supabase
          .from("space_members")
          .select("space_id")
          .in("space_id", circleIds)
          .eq("status", "active");

        const countMap: Record<string, number> = {};
        counts?.forEach((c) => {
          countMap[c.space_id] = (countMap[c.space_id] || 0) + 1;
        });

        setCircles(
          (circleData || []).map((s) => ({
            id: s.id,
            name: s.name,
            template: s.template || "general",
            memberCount: countMap[s.id] || 1,
          }))
        );
      } catch (err) {
        console.error("Error fetching circles:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCircles();
  }, [user]);

  const filteredCircles = circles.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "flex flex-col h-full bg-card/50 border-r border-border/50",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate("/circles")}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h2 className="font-semibold text-foreground text-sm">Doiralar</h2>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onCreateCircle}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish..."
            className="h-8 pl-8 text-sm bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      {/* Circles List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredCircles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Doiralar topilmadi
          </div>
        ) : (
          filteredCircles.map((circle) => (
            <button
              key={circle.id}
              onClick={() => navigate(`/circles/${circle.id}`)}
              className={cn(
                "w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all",
                circle.id === currentCircleId
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-secondary/50"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  circle.id === currentCircleId ? "text-primary" : "text-foreground"
                )}>
                  {circle.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {circle.memberCount} a'zo
                </p>
              </div>
              {circle.id === currentCircleId && (
                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Quick Access Buttons */}
      <div className="flex-shrink-0 p-2 border-t border-border/50 space-y-1">
        <button
          onClick={onShowMembers}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-md bg-secondary/80 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground flex-1">A'zolar</span>
          <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">
            {membersCount}
          </span>
        </button>
        
        {pendingRequestsCount > 0 && (
          <button
            onClick={onShowRequests}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-sm text-muted-foreground flex-1">So'rovlar</span>
            <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
              {pendingRequestsCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
