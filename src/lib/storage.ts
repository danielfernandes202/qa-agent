import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export async function uploadDocument(file: File): Promise<{ path: string, error: Error | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from('qa-documents')
      .upload(filePath, file);

    if (error) throw error;
    
    return { path: data.path, error: null };
  } catch (error: any) {
    console.error('Error uploading document to Supabase:', error);
    return { path: '', error };
  }
}

export async function getDocumentSignedUrl(path: string): Promise<{ signedUrl: string, error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from('qa-documents')
      .createSignedUrl(path, 60 * 60); // 1 hour expiry

    if (error) throw error;
    
    return { signedUrl: data.signedUrl, error: null };
  } catch (error: any) {
    console.error('Error getting signed URL for document:', error);
    return { signedUrl: '', error };
  }
}

import { SupabaseClient } from '@supabase/supabase-js';

export async function uploadVisualTestImage(base64Data: string, fileName?: string, customSupabase?: SupabaseClient): Promise<{ publicUrl: string, error: Error | null }> {
  try {
    const client = customSupabase || supabase;
    
    // Convert base64 to Blob
    const base64Parts = base64Data.split(',');
    const mimeMatch = base64Parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64String = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const ext = mimeType.split('/')[1] || 'jpeg';
    const path = fileName || `${uuidv4()}.${ext}`;

    const { data, error } = await client.storage
      .from('qa-visual-tests')
      .upload(path, blob, { contentType: mimeType });

    if (error) throw error;
    
    const { data: publicUrlData } = client.storage
      .from('qa-visual-tests')
      .getPublicUrl(data.path);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('Error uploading visual test image to Supabase:', error);
    return { publicUrl: '', error };
  }
}
