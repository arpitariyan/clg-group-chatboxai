/**
 * UI COMPONENTS LIBRARY REFERENCE
 * 
 * All pre-built shadcn UI components available for import.
 * DO NOT regenerate these components. IMPORT ONLY.
 * 
 * Location: components/ui/
 * Import Pattern: import { Component } from '@/components/ui/component-name'
 */

export const AVAILABLE_UI_COMPONENTS = {
  FORM_INPUTS: [
    {
      name: 'Button',
      file: 'button.jsx',
      exports: ['Button'],
      variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      sizes: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg'],
      usage: `import { Button } from '@/components/ui/button'
<Button variant="default" size="lg">Click me</Button>`,
    },
    {
      name: 'Input',
      file: 'input.jsx',
      exports: ['Input'],
      types: ['text', 'email', 'password', 'number', 'date', 'file'],
      usage: `import { Input } from '@/components/ui/input'
<Input type="email" placeholder="Enter email" />`,
    },
    {
      name: 'Textarea',
      file: 'textarea.jsx',
      exports: ['Textarea'],
      usage: `import { Textarea } from '@/components/ui/textarea'
<Textarea placeholder="Type message..." />`,
    },
    {
      name: 'Label',
      file: 'label.jsx',
      exports: ['Label'],
      usage: `import { Label } from '@/components/ui/label'
<Label htmlFor="email">Email</Label>`,
    },
    {
      name: 'Select',
      file: 'select.jsx',
      exports: ['Select', 'SelectGroup', 'SelectValue', 'SelectTrigger', 'SelectContent', 'SelectItem', 'SelectSeparator'],
      usage: `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
<Select>
  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>`,
    },
    {
      name: 'Checkbox',
      file: 'checkbox.jsx',
      exports: ['Checkbox'],
      usage: `import { Checkbox } from '@/components/ui/checkbox'
<Checkbox id="terms" />`,
    },
    {
      name: 'Radio Group',
      file: 'radio-group.jsx',
      exports: ['RadioGroup', 'RadioGroupItem'],
      usage: `import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
<RadioGroup>
  <RadioGroupItem value="option1" id="opt1" />
</RadioGroup>`,
    },
    {
      name: 'Switch',
      file: 'switch.jsx',
      exports: ['Switch'],
      usage: `import { Switch } from '@/components/ui/switch'
<Switch />`,
    },
    {
      name: 'Form',
      file: 'form.jsx',
      exports: ['Form', 'FormField', 'FormItem', 'FormLabel', 'FormControl', 'FormDescription', 'FormMessage', 'useFormField'],
      usage: `import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
<Form {...form}><FormField name="email" render={...} /></Form>`,
    },
  ],

  LAYOUT: [
    {
      name: 'Card',
      file: 'card.jsx',
      exports: ['Card', 'CardHeader', 'CardFooter', 'CardTitle', 'CardDescription', 'CardContent'],
      usage: `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Content</CardContent>
</Card>`,
    },
    {
      name: 'Tabs',
      file: 'tabs.jsx',
      exports: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
      usage: `import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
<Tabs defaultValue="tab1">
  <TabsList><TabsTrigger value="tab1">Tab 1</TabsTrigger></TabsList>
  <TabsContent value="tab1">Content</TabsContent>
</Tabs>`,
    },
    {
      name: 'Separator',
      file: 'separator.jsx',
      exports: ['Separator'],
      usage: `import { Separator } from '@/components/ui/separator'
<Separator />`,
    },
    {
      name: 'Accordion',
      file: 'accordion.jsx',
      exports: ['Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent'],
      usage: `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
<Accordion>
  <AccordionItem value="item1">
    <AccordionTrigger>Heading</AccordionTrigger>
    <AccordionContent>Content</AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
    {
      name: 'Table',
      file: 'table.jsx',
      exports: ['Table', 'TableHeader', 'TableBody', 'TableFooter', 'TableHead', 'TableRow', 'TableCell', 'TableCaption'],
      usage: `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
<Table>
  <TableHeader><TableRow><TableHead>Header</TableHead></TableRow></TableHeader>
  <TableBody><TableRow><TableCell>Data</TableCell></TableRow></TableBody>
</Table>`,
    },
    {
      name: 'Breadcrumb',
      file: 'breadcrumb.jsx',
      exports: ['Breadcrumb', 'BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbPage', 'BreadcrumbSeparator', 'BreadcrumbEllipsis'],
      usage: `import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Current</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`,
    },
  ],

  DIALOGS_POPOVERS: [
    {
      name: 'Dialog',
      file: 'dialog.jsx',
      exports: ['Dialog', 'DialogPortal', 'DialogOverlay', 'DialogTrigger', 'DialogClose', 'DialogContent', 'DialogHeader', 'DialogFooter', 'DialogTitle', 'DialogDescription'],
      usage: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent><DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader></DialogContent>
</Dialog>`,
    },
    {
      name: 'Alert Dialog',
      file: 'alert-dialog.jsx',
      exports: ['AlertDialog', 'AlertDialogTrigger', 'AlertDialogContent', 'AlertDialogHeader', 'AlertDialogFooter', 'AlertDialogTitle', 'AlertDialogDescription', 'AlertDialogAction', 'AlertDialogCancel'],
      usage: `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
<AlertDialog>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogContent><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogContent>
</AlertDialog>`,
    },
    {
      name: 'Popover',
      file: 'popover.jsx',
      exports: ['Popover', 'PopoverTrigger', 'PopoverAnchor', 'PopoverContent'],
      usage: `import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Content</PopoverContent>
</Popover>`,
    },
    {
      name: 'Dropdown Menu',
      file: 'dropdown-menu.jsx',
      exports: ['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuSeparator', 'DropdownMenuLabel', 'DropdownMenuShortcut'],
      usage: `import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
<DropdownMenu>
  <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
  <DropdownMenuContent><DropdownMenuItem>Action</DropdownMenuItem></DropdownMenuContent>
</DropdownMenu>`,
    },
    {
      name: 'Sheet',
      file: 'sheet.jsx',
      exports: ['Sheet', 'SheetTrigger', 'SheetContent', 'SheetHeader', 'SheetFooter', 'SheetTitle', 'SheetDescription'],
      usage: `import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent><SheetHeader><SheetTitle>Title</SheetTitle></SheetHeader></SheetContent>
</Sheet>`,
    },
    {
      name: 'Hover Card',
      file: 'hover-card.jsx',
      exports: ['HoverCard', 'HoverCardTrigger', 'HoverCardContent', 'HoverCardAnchor'],
      usage: `import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
<HoverCard>
  <HoverCardTrigger>Hover</HoverCardTrigger>
  <HoverCardContent>Info here</HoverCardContent>
</HoverCard>`,
    },
  ],

  FEEDBACK_DISPLAY: [
    {
      name: 'Alert',
      file: 'alert.jsx',
      exports: ['Alert', 'AlertTitle', 'AlertDescription'],
      variants: ['default', 'destructive'],
      usage: `import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
<Alert><AlertTitle>Heads up!</AlertTitle><AlertDescription>Details here</AlertDescription></Alert>`,
    },
    {
      name: 'Badge',
      file: 'badge.jsx',
      exports: ['Badge'],
      variants: ['default', 'secondary', 'destructive', 'outline'],
      usage: `import { Badge } from '@/components/ui/badge'
<Badge variant="secondary">New</Badge>`,
    },
    {
      name: 'Progress',
      file: 'progress.jsx',
      exports: ['Progress'],
      usage: `import { Progress } from '@/components/ui/progress'
<Progress value={65} />`,
    },
    {
      name: 'Skeleton',
      file: 'skeleton.jsx',
      exports: ['Skeleton'],
      usage: `import { Skeleton } from '@/components/ui/skeleton'
<Skeleton className="h-12 w-12 rounded-full" />`,
    },
    {
      name: 'Tooltip',
      file: 'tooltip.jsx',
      exports: ['Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipProvider'],
      usage: `import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover</TooltipTrigger>
    <TooltipContent>Info</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
    },
    {
      name: 'Calendar',
      file: 'calendar.jsx',
      exports: ['Calendar'],
      usage: `import { Calendar } from '@/components/ui/calendar'
<Calendar mode="single" />`,
    },
    {
      name: 'Avatar',
      file: 'avatar.jsx',
      exports: ['Avatar', 'AvatarImage', 'AvatarFallback'],
      usage: `import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
<Avatar>
  <AvatarImage src="url" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>`,
    },
  ],

  SPECIALIZED: [
    {
      name: 'Sidebar',
      file: 'sidebar.jsx',
      exports: ['Sidebar', 'SidebarContent', 'SidebarMenu', 'SidebarMenuButton', 'SidebarMenuItem'],
      usage: `import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar'`,
    },
    {
      name: 'MenuBar',
      file: 'menubar.jsx',
      exports: ['Menubar', 'MenubarMenu', 'MenubarTrigger', 'MenubarContent', 'MenubarItem'],
      usage: `import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'`,
    },
    {
      name: 'Collapsible',
      file: 'collapsible.jsx',
      exports: ['Collapsible', 'CollapsibleTrigger', 'CollapsibleContent'],
      usage: `import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'`,
    },
    {
      name: 'Scroll Area',
      file: 'scroll-area.jsx',
      exports: ['ScrollArea', 'ScrollBar'],
      usage: `import { ScrollArea } from '@/components/ui/scroll-area'
<ScrollArea><Content /></ScrollArea>`,
    },
    {
      name: 'Aspect Ratio',
      file: 'aspect-ratio.jsx',
      exports: ['AspectRatio'],
      usage: `import { AspectRatio } from '@/components/ui/aspect-ratio'
<AspectRatio ratio={16 / 9}><Image /></AspectRatio>`,
    },
  ],
};

// Quick lookup by component name
export const UI_COMPONENT_MAP = {};
Object.values(AVAILABLE_UI_COMPONENTS).forEach(category => {
  category.forEach(comp => {
    UI_COMPONENT_MAP[comp.name.toLowerCase()] = comp;
  });
});

/**
 * STYLE GUIDE
 * 
 * All components use:
 * - Tailwind CSS for styling
 * - Radix UI for unstyled primitives
 * - class-variance-authority (CVA) for variant management
 * - cn() utility for className merging
 * 
 * Color Palette (from tailwind.config.js):
 * - Primary: violet-600
 * - Secondary: slate-600
 * - Accent: cyan-400
 * - Destructive: red-600
 * - Dark theme: gray-950, gray-900, gray-800...
 * 
 * Spacing: Uses Tailwind scale (px, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4...)
 * Border radius: rounded-md (6px), rounded-lg (8px), rounded-xl (12px), rounded-2xl (16px)
 * 
 * DARK MODE:
 * All components include dark mode support via Tailwind's 'dark:' prefix
 * Example: bg-white dark:bg-gray-950
 */

export const COMPONENT_IMPORT_TEMPLATE = (componentNames) => {
  const imports = componentNames.map(name => {
    const comp = UI_COMPONENT_MAP[name.toLowerCase()];
    if (!comp) return `// ${name} not found`;
    return `import { ${comp.exports.join(', ')} } from '@/components/ui/${comp.file.replace('.jsx', '')}'`;
  });
  return imports.join('\n');
};

export default AVAILABLE_UI_COMPONENTS;
