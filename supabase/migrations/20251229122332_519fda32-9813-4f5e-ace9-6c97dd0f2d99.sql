-- Create cylinder_exchanges table
CREATE TABLE public.cylinder_exchanges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  from_brand TEXT NOT NULL,
  from_weight TEXT NOT NULL,
  to_brand TEXT NOT NULL,
  to_weight TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cylinder_exchanges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read exchanges" 
ON public.cylinder_exchanges 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create exchanges" 
ON public.cylinder_exchanges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exchanges" 
ON public.cylinder_exchanges 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exchanges" 
ON public.cylinder_exchanges 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cylinder_exchanges;

-- Create updated_at trigger
CREATE TRIGGER update_cylinder_exchanges_updated_at
BEFORE UPDATE ON public.cylinder_exchanges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();