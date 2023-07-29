import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Chroma } from 'langchain/vectorstores/chroma';
// import { CustomPDFLoader } from '@/utils/customPDFLoader';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import {
  JSONLoader,
  JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import { ChromaClient } from 'chromadb/dist/main/ChromaClient'

/* Name of directory to retrieve your files from */
const filePath = 'docs';

export const run = async () => {
  try {
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new PDFLoader(path, {splitPages:true}),
      '.docx': (path) => new DocxLoader(path),
      '.json': (path) => new JSONLoader(path, "/texts"),
      '.jsonl': (path) => new JSONLinesLoader(path, "/html"),
      '.txt': (path) => new TextLoader(path),
      '.csv': (path) => new CSVLoader(path, "text"),
      '.htm': (path) => new UnstructuredLoader(path),
      '.html': (path) => new UnstructuredLoader(path),
      '.ppt': (path) => new UnstructuredLoader(path),
      '.pptx': (path) => new UnstructuredLoader(path),
    });

    const rawDocs = await directoryLoader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2048,
      chunkOverlap: 200
    });

    const docs = await textSplitter.splitDocuments(rawDocs, {
      appendChunkOverlapHeader: true,
      chunkHeader: `DOCUMENT NAME: AI for Low-Code AI`,
    });
    // const docs = rawDocs//await textSplitter.splitDocuments(rawDocs);

    const chromaDB = new ChromaClient({ path: "http://localhost:8000" })
    await chromaDB.deleteCollection({ name: process.env.COLLECTION_NAME ?? "" })
    console.log("Deleted")

    console.log('creating vector store...');

    //const embedder = new OpenAIEmbeddings({ maxConcurrency: 1 });
    const embedder = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY ?? ''});
    let transDocs = docs.map((doc) => {
      return {
        ...doc,
        pageContent: doc.pageContent.replaceAll("\n", " ")
      }
    })
    // await Chroma.deleteCollection({ name: process.env.COLLECTION_NAME });
    await Chroma.fromDocuments(transDocs, embedder, {
      collectionName: process.env.COLLECTION_NAME,
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
