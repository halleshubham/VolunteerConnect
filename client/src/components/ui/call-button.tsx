import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const CallButton = ({ phoneNumber }: { phoneNumber: string }) => {
    return (
      <a href={`tel:${phoneNumber}`}>
        <button className="bg-black text-white px-4 py-2 rounded">
        {phoneNumber}
        </button>
      </a>
    );
  };
  
export default CallButton;