// React is automatically imported by the JSX transform
import './App.css';
import TranscriptDisplay from './components/TranscriptDisplay';

function App() {
  return (
    <div className="App">
      <header className="bg-slate-800 text-white p-4 mb-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Speech-to-Text Transcription Service</h1>
          <p className="text-sm opacity-75">With real-time sentiment analysis and SRT export</p>
        </div>
      </header>
      <main>
        <TranscriptDisplay />
      </main>
      <footer className="mt-8 p-4 text-center text-gray-500 text-sm">
        <p>Powered by FastAPI, PostgreSQL, AssemblyAI, and React</p>
      </footer>
    </div>
  );
}

export default App;
