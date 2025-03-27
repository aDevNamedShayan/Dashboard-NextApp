'use server'

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { z } from "zod"
import { sql } from "./data"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
})

const CreateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  if(!validatedFields.success) return {
    errors: validatedFields.error.flatten().fieldErrors,
    message: 'Missing Fields. Failed to Create Invoice.'
  }

  const { customerId, amount, status } = validatedFields.data
  const amountInCents = amount * 100
  const date = new Date().toISOString().split('T')[0]

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.log(`Failed to Create Invoice. Database Error: ${error}`)
    return {
      message: `Failed to Create Invoice. Database Error: ${error}`
    }
  }
  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')

  // const rawFormData = {
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status'),
  // }
  // console.log(rawFormData)
  // console.log(typeof rawFormData.amount) //string
  // console.log(typeof Number(rawFormData.amount))
  // console.log(typeof +rawFormData.amount!)
}


const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const  validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  if(!validatedFields.success) return {
    errors: validatedFields.error.flatten().fieldErrors,
    message: 'Missing Fields. Failed to Update Invoices.'
  }

  const { customerId, amount, status } = validatedFields.data
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.log(`Failed to Update Invoice. Database Error: ${error}`)
    return {
      message: `Failed to Update Invoice. Database Error: ${error}`
    }
  }
  
  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices') // strangely, redirect works by throwing an error, which would get caught by the catch block of try-catch, so its placement must remain outside of the try-catch, as it will only be reachable if try is successful.
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to delete invoice')

  await sql`DELETE FROM invoices WHERE id = ${id}`
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData)
  } catch (error) {
    if(error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.'
      
        default:
          return 'Something went wrong.'
      }
    }
    throw error
  }
}