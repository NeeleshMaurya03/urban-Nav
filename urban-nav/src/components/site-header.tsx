"use client"

import Link from "next/link";
import UrbanNavLogo from "@/assets/logo.svg"
import {TrafficCone, MenuIcon, MapPin, DollarSign, Book} from "lucide-react";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet"
import {useState} from "react";

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [adminProfile] = useState({
    name: "Amit Sharma",
    role: "Traffic Commissioner",
    department: "Urban Traffic Management",
    email: "amit.sharma@urbannav.gov"
  });

  return (
    <>
      <header className={"py-4 border-b max-md:backdrop-blur md:border-none sticky top-0 z-10"}>
        <div className={"container max-md:px-4"}>
          <div className={"flex items-center justify-between md:border md:p-2.5 md:rounded-xl max-w-2xl mx-auto md:backdrop-blur "}>
            <Link href={"/"}>
              <div className={"border size-10 rounded-lg inline-flex items-center justify-center"}>
                <UrbanNavLogo className={"size-8 h-auto"} />
              </div>
            </Link>
            <section className={"max-md:hidden"}>
              <nav className={"flex gap-8 items-center text-sm"}>
                <Link href={"#features"} className={"text-white/70 hover:text-white transition"}>Features</Link>
                <Link href={"#solutions"} className={"text-white/70 hover:text-white transition"}>Solutions</Link>
                <Link href={"#pricing"} className={"text-white/70 hover:text-white transition"}>Pricing</Link>
                <Link href={"/admin"} className={"text-white/70 hover:text-white transition"}>Public Complaints</Link>
              </nav>
            </section>
            <section className={"flex max-md:gap-4 items-center"}>
              <Link 
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                {adminProfile.name}
              </Link>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger>
                  <MenuIcon className={"size-9 md:hidden hover:text-white/70 transition"}/>
                </SheetTrigger>
                <SheetContent side={"top"} className={"p-8"}>
                  <div className={"inline-flex items-center center gap-3"}>
                    <div className={"border size-8 rounded-lg inline-flex items-center justify-center"}>
                      <UrbanNavLogo className={"size-6 h-auto"}/>
                    </div>
                    <p className={"font-bold"}>Urban Nav</p>
                  </div>
                  <div className={"mt-8 mb-4"}>
                    <nav className={"grid gap-4 items-center text-lg"}>
                      <Link href={"#features"} className={"flex items-center gap-3 text-white/70 hover:text-white transition"}>
                        <TrafficCone className={"size-6"} />
                        Features
                      </Link>
                      <Link href={"#solutions"} className={"flex items-center gap-3 text-white/70 hover:text-white transition"}>
                        <MapPin className={"size-6"} />
                        Solutions
                      </Link>
                      <Link href={"#pricing"} className={"flex items-center gap-3 text-white/70 hover:text-white transition"}>
                        <DollarSign className={"size-6"} />
                        Pricing
                      </Link>
                      <Link href={"#resources"} className={"flex items-center gap-3 text-white/70 hover:text-white transition"}>
                        <Book className={"size-6"} />
                        Resources
                      </Link>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </section>
          </div>
        </div>
      </header>
    </>
  )
}