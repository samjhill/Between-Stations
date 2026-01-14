declare module 'pdf-extraction' {
  type Options = {
    normalizeWhitespace?: boolean;
  };

  type Result = {
    text?: string;
  };

  // The package exports a default function that accepts a Buffer and returns extracted text metadata.
  export default function pdfExtraction(input: Buffer, options?: Options): Promise<Result>;
}

