import { useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { cn } from "../../lib/utils"
import AppIcon from "../branding/AppIcon"

export function NavBar({ items, className }) {
  const [activeTab, setActiveTab] = useState(items[0].name)

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6",
        className,
      )}
    >
      <div className="flex items-center gap-3 bg-white/50 border border-slate-200 backdrop-blur-lg py-1 px-1 pr-2 pl-3 rounded-full shadow-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <AppIcon size={32} />
          <span className="font-heading font-black text-primary-900 text-lg tracking-tight hidden md:block">CareBridge</span>
        </div>

        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          const Component = item.action ? "button" : Link;
          const props = item.action
            ? {
                onClick: () => {
                  setActiveTab(item.name);
                  item.action();
                },
                type: "button"
              }
            : {
                to: item.url,
                onClick: () => setActiveTab(item.name)
              };

          return (
            <Component
              key={item.name}
              {...props}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                "text-slate-600 hover:text-primary-900",
                isActive && "bg-slate-100 text-primary-900",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-primary-100/50 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-t-full">
                    <div className="absolute w-12 h-6 bg-primary-600/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-primary-600/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-primary-600/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Component>
          )
        })}
      </div>
    </div>
  )
}
