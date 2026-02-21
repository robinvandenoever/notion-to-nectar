
-- Create storage bucket for inspection audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-audio', 'inspection-audio', false);

-- Allow anyone to upload (no auth yet)
CREATE POLICY "Anyone can upload inspection audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inspection-audio');

-- Allow anyone to read
CREATE POLICY "Anyone can read inspection audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-audio');
