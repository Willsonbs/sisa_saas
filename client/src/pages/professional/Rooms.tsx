import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, Users, Wifi, Monitor, Coffee, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

export default function RoomsPage() {
  const { data: rooms, isLoading } = trpc.rooms.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Salas Disponíveis</h1>
          <p className="text-muted-foreground">Escolha uma sala para fazer sua reserva</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {room.photos && room.photos.length > 0 ? (
                  <div className="h-48 bg-muted relative overflow-hidden">
                    <img
                      src={room.photos[0]}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Calendar className="h-16 w-16 text-primary/30" />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{room.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {room.description || "Sala de atendimento profissional"}
                      </CardDescription>
                    </div>
                    {room.isActive && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ativa
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Capacidade: {room.capacity} {room.capacity === 1 ? 'pessoa' : 'pessoas'}</span>
                  </div>

                  {room.equipment && room.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {room.equipment.slice(0, 3).map((item: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                      {room.equipment.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{room.equipment.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">A partir de</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(room.pricePerHour)}/h
                        </p>
                      </div>
                    </div>
                    
                    <Button className="w-full" asChild>
                      <Link href={`/rooms/${room.id}/book`}>
                        Reservar Agora
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma sala disponível</p>
              <p className="text-muted-foreground">
                Entre em contato com a administração para mais informações
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
