import { Plus, MessageSquareText, PenLine, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function NewAppointmentDropdown() {
  const [, navigate] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
          <ChevronDown className="ml-2 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => navigate("/appointments/new")} className="cursor-pointer py-3">
          <PenLine className="mr-3 h-4 w-4" />
          <div>
            <div className="font-medium">Manual Create</div>
            <div className="text-xs text-muted-foreground">Fill out the form manually</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/appointments/new/conversation")} className="cursor-pointer py-3">
          <MessageSquareText className="mr-3 h-4 w-4" />
          <div>
            <div className="font-medium">Conversation Create</div>
            <div className="text-xs text-muted-foreground">AI-powered from chat/text</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
