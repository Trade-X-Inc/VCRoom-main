import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ldimninnjlvxozubheib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM5ODM2OCwiZXhwIjoyMDkyOTc0MzY4fQ.KuXqKpHt3RMt_C2ZSZGTweUlGqziVAFaeRvTF7-6OZ0',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

console.log('Deleting all records from public.users...')
const { error: tableErr } = await supabase
  .from('users')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000')
if (tableErr) console.error('users table error:', tableErr.message)
else console.log('public.users cleared')

console.log('Listing auth users...')
const { data, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (listErr) { console.error('List error:', listErr.message); process.exit(1) }

const users = data?.users ?? []
console.log(`Found ${users.length} auth user(s)`)

for (const u of users) {
  const { error } = await supabase.auth.admin.deleteUser(u.id)
  if (error) console.error(`Failed to delete ${u.email}:`, error.message)
  else console.log(`Deleted: ${u.email}`)
}

console.log('Done.')
