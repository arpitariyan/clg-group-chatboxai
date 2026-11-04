import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Controller, FormProvider, useFormContext } from "react-hook-form"

import { cn } from "@/lib/utils"

const Form = FormProvider

const FormFieldContext = React.createContext({}, undefined)

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  return {
    ...fieldState,
    isDirty: fieldState.isDirty,
    isTouched: fieldState.isTouched,
    invalid: fieldState.invalid,
    ...itemContext,
  }
}

const FormField = ({ ...props }) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
)

const FormItemContext = React.createContext({}, undefined)

const FormItem = React.forwardRef(({ className, ...props }, ref) => (
  <FormItemContext.Provider value={{}}>
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  </FormItemContext.Provider>
))
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef(({ className, ...props }, ref) => {
  const { error, required } = useFormField()

  return (
    <label
      ref={ref}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", error && "text-destructive", className)}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef(({ ...props }, ref) => {
  const { error, invalid } = useFormField()

  return <Slot ref={ref} aria-invalid={invalid} {...props} />
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef(({ className, children, ...props }, ref) => {
  const { error } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p ref={ref} className={cn("text-sm font-medium text-destructive", className)} {...props}>
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export { useFormField, Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage }
