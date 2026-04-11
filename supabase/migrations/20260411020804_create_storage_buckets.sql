-- Crear bucket PRIVADO para documentos (CIP, contratos, etc.)
insert into storage.buckets (id, name, public)
values ('fifer-documents', 'fifer-documents', false)
on conflict (id) do nothing;

-- Crear bucket PÚBLICO para avatares y logos
insert into storage.buckets (id, name, public)
values ('fifer-avatars', 'fifer-avatars', true)
on conflict (id) do nothing;

-- Nota: Como nuestro backend usa supabaseAdmin (Service Role) para subir archivos, 
-- se salta el RLS por defecto, por lo que no necesitamos crear políticas complejas 
-- de inserción ahora mismo.
