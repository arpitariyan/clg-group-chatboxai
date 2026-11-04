'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  FileCodeIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
  Paperclip,
  Puzzle,
  Search,
  Plus as PlusIcon,
  Sparkles,
  Zap,
  Activity,
  Brain,
  Atom,
} from "lucide-react"

import { Plus, Lock } from "@/components/ui/animated-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TOOLBAR_TOGGLE } from "@/components/surface"
import { useTheme } from "@/contexts/ThemeContext"
import { useAppConnections } from "@/contexts/AppConnectionContext"
import { useModel } from "@/contexts/ModelContext"
import { toast } from "@/lib/alert"

export default function ComposerPlusMenu({
  onAttachFiles,
  searchType = "search",
  onSearchTypeChange,
  researchLocked = false,
  researchUsage = { weeklyCount: 0, weeklyLimit: 0, remaining: 0 },
  onShowResearchLimitModal,
  isImageGenMode = false,
  uploadedFilesCount = 0,
  selectedApp = null,
  onSelectApp = () => { },
  onOpenChange,
  className = "",
}) {
  const router = useRouter()
  const { themeMode, setThemeMode, isDarkMode } = useTheme()
  const { connectedApps } = useAppConnections()
  const { effortLevel = 'auto', setEffortLevel } = useModel()

  const [isOpen, setIsOpen] = React.useState(false)
  const [appSearch, setAppSearch] = React.useState("")

  const activeApps = React.useMemo(() => {
    return (connectedApps || []).filter((c) => c.status === "active")
  }, [connectedApps])

  const filteredApps = React.useMemo(() => {
    if (!appSearch.trim()) return activeApps
    const q = appSearch.toLowerCase()
    return activeApps.filter((app) =>
      (app.appName || "").toLowerCase().includes(q)
    )
  }, [activeApps, appSearch])

  const handleOpenChange = (open) => {
    setIsOpen(open)
    if (!open) setAppSearch("")
    if (onOpenChange) onOpenChange(open)
  }

  const handleAttach = () => {
    if (onAttachFiles) onAttachFiles()
    setIsOpen(false)
  }

  const handleDeepResearch = () => {
    if (researchLocked) {
      if (onShowResearchLimitModal) onShowResearchLimitModal()
      else toast.error("Deep Research weekly limit reached.")
      setIsOpen(false)
      return
    }
    if (onSearchTypeChange) {
      onSearchTypeChange(searchType === "research" ? "search" : "research")
    }
    setIsOpen(false)
  }

  const handleWebsiteBuilder = () => {
    if (onSearchTypeChange) {
      onSearchTypeChange(searchType === "code" ? "search" : "code")
    }
    setIsOpen(false)
  }

  const handleSelectApp = (app) => {
    if (selectedApp?.appId === app.appId) {
      onSelectApp(null)
    } else {
      onSelectApp(app)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={`${TOOLBAR_TOGGLE(isOpen)} ${isOpen ? "rotate-45" : ""
            } transition-transform duration-200 ${className}`}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-52" side="top" align="start" sideOffset={8}>
        {/* Creation Tools */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>File</DropdownMenuLabel>

          {/* Attach Files */}
          <DropdownMenuItem onClick={handleAttach}>
            <Paperclip />
            Attach Files
            <DropdownMenuShortcut>
              {uploadedFilesCount > 0 ? `${uploadedFilesCount} files` : "⌘U"}
            </DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* Deep Research */}
          {!isImageGenMode && (
            <DropdownMenuItem
              onClick={handleDeepResearch}
              className={searchType === "research" ? "bg-accent/80 text-accent-foreground font-semibold" : ""}
            >
              {researchLocked ? <Lock /> : <Atom />}
              Deep Research
              <DropdownMenuShortcut>
                {researchLocked
                  ? "Locked"
                  : researchUsage?.weeklyLimit > 0
                    ? `${Math.max(0, researchUsage.remaining)}/${researchUsage.weeklyLimit}`
                    : "⌘D"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {/* Website Builder */}
          {!isImageGenMode && (
            <DropdownMenuItem
              onClick={handleWebsiteBuilder}
              className={searchType === "code" ? "bg-accent/80 text-accent-foreground font-semibold" : ""}
            >
              <FileCodeIcon />
              Website Builder
              <DropdownMenuShortcut>
                {searchType === "code" ? "Active" : "⌘B"}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Integrations & Appearance */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Preferences</DropdownMenuLabel>

          {/* Connected Apps (App Connection Input & Selection) */}
          {!isImageGenMode && searchType !== "code" && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Puzzle />
                Connected Apps
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56 p-1.5">
                  {/* Search input for apps */}
                  <div className="p-1 pb-1.5 border-b border-border/40 mb-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <input
                        type="text"
                        aria-label="Search connected apps"
                        placeholder="Search apps..."
                        value={appSearch}
                        onChange={(e) => setAppSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full h-7 pl-6 pr-2 rounded-md bg-muted/40 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                        autoFocus
                      />
                    </div>
                  </div>

                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Connected Apps</DropdownMenuLabel>
                    {activeApps.length === 0 ? (
                      <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                        No apps connected yet
                      </DropdownMenuItem>
                    ) : filteredApps.length === 0 ? (
                      <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                        No apps match &ldquo;{appSearch}&rdquo;
                      </DropdownMenuItem>
                    ) : (
                      filteredApps.map((app) => {
                        const isSelected = selectedApp?.appId === app.appId
                        return (
                          <DropdownMenuItem
                            key={app.appId}
                            onClick={(e) => {
                              e.preventDefault()
                              handleSelectApp(app)
                            }}
                            className={isSelected ? "font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : ""}
                          >
                            {app.appIcon ? (
                              <img
                                src={app.appIcon}
                                alt=""
                                className="size-4 object-contain rounded-xs"
                              />
                            ) : (
                              <Puzzle />
                            )}
                            {app.appName}
                            {isSelected && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                          </DropdownMenuItem>
                        )
                      })
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => {
                        router.push("/app/connections")
                        setIsOpen(false)
                      }}
                    >
                      <PlusIcon />
                      {activeApps.length > 0 ? "Manage Apps" : "Connect Apps"}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          {/* Reasoning Effort Submenu */}
          {!isImageGenMode && searchType !== "code" && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sparkles />
                Effort
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Reasoning Effort</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={effortLevel || "auto"}
                      onValueChange={(val) => setEffortLevel && setEffortLevel(val)}
                    >
                      <DropdownMenuRadioItem value="auto">
                        <Sparkles />
                        Auto (Adaptive)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="low">
                        <Zap />
                        Low
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="medium">
                        <Activity />
                        Medium
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="high">
                        <Brain />
                        High
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="max">
                        <Atom />
                        Max Think
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          {/* Theme Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PaletteIcon />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={themeMode || (isDarkMode ? "dark" : "light")}
                    onValueChange={(val) => setThemeMode && setThemeMode(val)}
                  >
                    <DropdownMenuRadioItem value="light">
                      <SunIcon />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <MoonIcon />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <MonitorIcon />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
