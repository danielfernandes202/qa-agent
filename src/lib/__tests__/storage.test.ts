import { uploadDocument, getDocumentSignedUrl, uploadVisualTestImage } from '../storage';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('Supabase Storage Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload a document and return path', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test-path.pdf' }, error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({ upload: mockUpload });

      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      const result = await uploadDocument(file);

      expect(supabase.storage.from).toHaveBeenCalledWith('qa-documents');
      expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/), file);
      expect(result).toEqual({ path: 'test-path.pdf', error: null });
    });

    it('should return error if upload fails', async () => {
      const error = new Error('Upload failed');
      const mockUpload = jest.fn().mockResolvedValue({ data: null, error });
      (supabase.storage.from as jest.Mock).mockReturnValue({ upload: mockUpload });

      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      const result = await uploadDocument(file);

      expect(result).toEqual({ path: '', error });
    });
  });

  describe('getDocumentSignedUrl', () => {
    it('should return a signed URL', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

      const result = await getDocumentSignedUrl('test-path.pdf');

      expect(supabase.storage.from).toHaveBeenCalledWith('qa-documents');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('test-path.pdf', 3600);
      expect(result).toEqual({ signedUrl: 'https://example.com/signed', error: null });
    });

    it('should return error if creating signed URL fails', async () => {
      const error = new Error('Signing failed');
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({ data: null, error });
      (supabase.storage.from as jest.Mock).mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

      const result = await getDocumentSignedUrl('test-path.pdf');

      expect(result).toEqual({ signedUrl: '', error });
    });
  });

  describe('uploadVisualTestImage', () => {
    it('should upload image and return public URL', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test-img.jpg' }, error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/public.jpg' } });
      
      (supabase.storage.from as jest.Mock).mockReturnValue({ 
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      });

      const base64Data = 'data:image/jpeg;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
      const result = await uploadVisualTestImage(base64Data, 'test-img.jpg');

      expect(supabase.storage.from).toHaveBeenCalledWith('qa-visual-tests');
      expect(mockUpload).toHaveBeenCalledWith('test-img.jpg', expect.any(Blob), { contentType: 'image/jpeg' });
      expect(mockGetPublicUrl).toHaveBeenCalledWith('test-img.jpg');
      expect(result).toEqual({ publicUrl: 'https://example.com/public.jpg', error: null });
    });

    it('should return error if image upload fails', async () => {
      const error = new Error('Image upload failed');
      const mockUpload = jest.fn().mockResolvedValue({ data: null, error });
      (supabase.storage.from as jest.Mock).mockReturnValue({ upload: mockUpload });

      const base64Data = 'data:image/jpeg;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
      const result = await uploadVisualTestImage(base64Data);

      expect(result).toEqual({ publicUrl: '', error });
    });
  });
});
