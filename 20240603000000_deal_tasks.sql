CREATE TABLE IF NOT EXISTS deal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id uuid REFERENCES deal_rooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  assignee_id uuid REFERENCES users(id),
  due_date date,
  completed boolean DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_tasks_members" ON deal_tasks
  FOR ALL USING (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members
      WHERE user_id = auth.uid()
    )
  );
