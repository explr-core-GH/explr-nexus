import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThumbnailRequest {
  fileUrl: string;
  fileName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY');
    if (!CLOUDCONVERT_API_KEY) {
      console.error('CLOUDCONVERT_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'CloudConvert API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase environment variables not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileUrl, fileName } = await req.json() as ThumbnailRequest;
    
    if (!fileUrl || !fileName) {
      return new Response(
        JSON.stringify({ error: 'fileUrl and fileName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing thumbnail for: ${fileName}`);

    // Determine input format from file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    let inputFormat = 'pdf';
    
    if (ext === 'doc' || ext === 'docx') {
      inputFormat = ext;
    } else if (ext === 'ppt' || ext === 'pptx') {
      inputFormat = ext;
    } else if (ext === 'xls' || ext === 'xlsx') {
      inputFormat = ext;
    } else if (ext === 'pdf') {
      inputFormat = 'pdf';
    }

    console.log(`Input format detected: ${inputFormat}`);

    // Step 1: Create a CloudConvert job with import, convert, and export tasks
    const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/url',
            url: fileUrl,
          },
          'convert-to-png': {
            operation: 'convert',
            input: ['import-file'],
            output_format: 'png',
            // Only convert first page for thumbnail
            page_range: '1',
            // Set reasonable dimensions for thumbnail
            width: 400,
            height: 400,
            fit: 'max',
          },
          'export-result': {
            operation: 'export/url',
            input: ['convert-to-png'],
          },
        },
        tag: 'lovable-thumbnail',
      }),
    });

    if (!jobResponse.ok) {
      const errorText = await jobResponse.text();
      console.error(`CloudConvert job creation failed [${jobResponse.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create conversion job', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobData = await jobResponse.json();
    const jobId = jobData.data.id;
    console.log(`CloudConvert job created: ${jobId}`);

    // Step 2: Poll for job completion (max 60 seconds)
    const startTime = Date.now();
    const maxWaitTime = 60000; // 60 seconds
    let thumbnailUrl: string | null = null;

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`Failed to check job status:`, errorText);
        continue;
      }

      const statusData = await statusResponse.json();
      const jobStatus = statusData.data.status;
      console.log(`Job ${jobId} status: ${jobStatus}`);

      if (jobStatus === 'finished') {
        // Find the export task result
        const exportTask = statusData.data.tasks.find(
          (task: any) => task.name === 'export-result' && task.status === 'finished'
        );
        
        if (exportTask?.result?.files?.[0]?.url) {
          thumbnailUrl = exportTask.result.files[0].url;
          console.log(`Thumbnail URL from CloudConvert: ${thumbnailUrl}`);
        }
        break;
      } else if (jobStatus === 'error') {
        const errorTask = statusData.data.tasks.find((task: any) => task.status === 'error');
        console.error('CloudConvert job failed:', errorTask?.message || 'Unknown error');
        return new Response(
          JSON.stringify({ error: 'Document conversion failed', details: errorTask?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!thumbnailUrl) {
      console.error('Timeout waiting for CloudConvert job');
      return new Response(
        JSON.stringify({ error: 'Conversion timed out' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Download the thumbnail from CloudConvert
    const thumbnailResponse = await fetch(thumbnailUrl);
    if (!thumbnailResponse.ok) {
      console.error('Failed to download thumbnail from CloudConvert');
      return new Response(
        JSON.stringify({ error: 'Failed to download thumbnail' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const thumbnailBlob = await thumbnailResponse.blob();
    const thumbnailArrayBuffer = await thumbnailBlob.arrayBuffer();

    // Step 4: Upload thumbnail to Supabase storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const thumbnailFileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(thumbnailFileName, thumbnailArrayBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload thumbnail to storage:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload thumbnail', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Thumbnail uploaded successfully: ${thumbnailFileName}`);

    // Return the path (not the full URL - the client will construct it)
    return new Response(
      JSON.stringify({ 
        success: true, 
        thumbnailPath: thumbnailFileName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating thumbnail:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
