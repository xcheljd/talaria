import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useState } from 'react';
import { ChevronDown, Mail, Settings, User } from 'lucide-react';

export function ComponentsShowcase() {
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">shadcn/ui Components Showcase</h1>
        <p className="text-muted-foreground">
          This page verifies all installed shadcn/ui components render correctly
          with proper styling.
        </p>

        <Separator />

        {/* Button */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Button</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </section>

        <Separator />

        {/* Card */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Card</h2>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description text</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is the card content area.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        {/* Input & Label */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Input & Label</h2>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="demo-input">Name</Label>
            <Input id="demo-input" placeholder="Enter your name..." />
          </div>
        </section>

        <Separator />

        {/* Select */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Select</h2>
          <div className="max-w-sm">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option-1">Option 1</SelectItem>
                <SelectItem value="option-2">Option 2</SelectItem>
                <SelectItem value="option-3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Textarea */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Textarea</h2>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="demo-textarea">Message</Label>
            <Textarea
              id="demo-textarea"
              placeholder="Type your message here..."
            />
          </div>
        </section>

        <Separator />

        {/* Dialog */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Dialog</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a dialog component with some content.
                </DialogDescription>
              </DialogHeader>
              <p className="py-4">Dialog body content goes here.</p>
              <DialogFooter>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        <Separator />

        {/* Alert Dialog */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Alert Dialog</h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Item</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  item.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <Separator />

        {/* Tabs */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Tabs</h2>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <Card>
                <CardContent className="pt-6">Content for Tab 1.</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tab2">
              <Card>
                <CardContent className="pt-6">Content for Tab 2.</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tab3">
              <Card>
                <CardContent className="pt-6">Content for Tab 3.</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* Toast/Sonner */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Toast (Sonner)</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => toast.success('Success toast notification!')}
            >
              Success Toast
            </Button>
            <Button
              variant="destructive"
              onClick={() => toast.error('Error toast notification!')}
            >
              Error Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info('Info toast notification!')}
            >
              Info Toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.warning('Warning toast notification!')}
            >
              Warning Toast
            </Button>
          </div>
        </section>

        <Separator />

        {/* Badge */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Badge</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <Separator />

        {/* Separator */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Separator</h2>
          <p className="text-sm text-muted-foreground">
            Separators are used between each section on this page (see above and
            below).
          </p>
        </section>

        <Separator />

        {/* Tooltip */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Tooltip</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </section>

        <Separator />

        {/* Collapsible */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Collapsible</h2>
          <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Click to toggle
                <ChevronDown
                  className={`size-4 transition-transform ${collapsibleOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-md border p-4">
              <p>This content is collapsible. Toggle to show/hide.</p>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <Separator />

        {/* Switch */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Switch</h2>
          <div className="flex items-center gap-3">
            <Switch
              id="demo-switch"
              checked={switchChecked}
              onCheckedChange={setSwitchChecked}
            />
            <Label htmlFor="demo-switch">
              {switchChecked ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        </section>

        <Separator />

        {/* Dropdown Menu */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Dropdown Menu</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Mail className="mr-2 size-4" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        <Separator />

        {/* Form - using basic form elements */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Form</h2>
          <p className="text-sm text-muted-foreground">
            The Form component provides React Hook Form integration. Basic form
            elements (Input, Label, Select, etc.) are demonstrated above. Full
            Form usage with validation will be implemented in the Profile page.
          </p>
        </section>
      </div>
    </div>
  );
}
