import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimelineEvent } from "@/lib/mockData";
import { Activity, FileText, Pill, DollarSign, UserCheck, LogOut } from "lucide-react";

interface TimelineProps {
  events: TimelineEvent[];
}

const typeIcons = {
  admission: UserCheck,
  lab: FileText,
  medication: Pill,
  note: Activity,
  billing: DollarSign,
  discharge: LogOut,
};

const typeColors = {
  admission: "bg-success/10 text-success",
  lab: "bg-primary/10 text-primary",
  medication: "bg-warning/10 text-warning",
  note: "bg-accent",
  billing: "bg-muted",
  discharge: "bg-destructive/10 text-destructive",
};

export function Timeline({ events }: TimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No timeline events yet</p>
          </div>
        ) : (
          <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {events.map((event, index) => {
              const Icon = typeIcons[event.type];
              return (
                <div key={event.id} className="relative pl-10">
                  <div className={`absolute left-0 top-1 rounded-full p-2 ${typeColors[event.type]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{event.activity}</p>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()} · {event.actor} ({event.actorRole})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
