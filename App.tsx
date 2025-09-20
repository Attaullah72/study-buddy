import React, { useState, useEffect, useRef } from 'react';
import {
  generateStudyGuide,
  generateQuizQuestion,
  evaluateAnswer,
  generateKeyPoints,
  generateSummary,
} from './services/geminiService';
import { AppState, EvaluationFeedback, Source, HistoryItem } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import {
  BookOpenIcon,
  SparklesIcon,
  ArrowRightIcon,
  RefreshIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  LinkIcon,
  SunIcon,
  MoonIcon,
  SearchIcon,
} from './components/icons';
import ReactMarkdown from 'react-markdown';

const App: React.FC = () => {
  // App flow state
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [topic, setTopic] = useState<string>('');
  const [studyGuide, setStudyGuide] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [keyPoints, setKeyPoints] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  
  // Quiz state
  const [questionsAsked, setQuestionsAsked] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [score, setScore] = useState(0);
  const quizLength = 5;

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // UI state
  const [darkMode, setDarkMode] = useState(true);

  // Refs
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('studyBuddyHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('studyBuddyHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  // Handle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo(0, 0);
  };
  
  const resetQuizState = () => {
    setQuestionsAsked([]);
    setCurrentQuestion('');
    setUserAnswer('');
    setFeedback(null);
    setScore(0);
  };
  
  const resetAllState = () => {
    setTopic('');
    setStudyGuide('');
    setSources([]);
    setKeyPoints('');
    setSummary('');
    setError(null);
    resetQuizState();
    setAppState(AppState.INITIAL);
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setAppState(AppState.GENERATING_GUIDE);
    setError(null);
    setStudyGuide('');
    setSources([]);
    setKeyPoints('');
    setSummary('');
    resetQuizState();
    
    try {
      const { guide, sources } = await generateStudyGuide(topic);
      setStudyGuide(guide);
      setSources(sources);
      setAppState(AppState.STUDYING);

      // Add to history if it's a new topic
      if (!history.some(item => item.topic.toLowerCase() === topic.toLowerCase())) {
        const newHistory = [{ topic, guide, sources }, ...history];
        setHistory(newHistory);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleStartQuiz = async () => {
    resetQuizState();
    setAppState(AppState.ASKING_QUESTION);
    await fetchNextQuestion();
  };

  const fetchNextQuestion = async () => {
    setUserAnswer('');
    setFeedback(null);
    if (questionsAsked.length >= quizLength) {
      setAppState(AppState.QUIZ_COMPLETE);
      return;
    }
    setAppState(AppState.ASKING_QUESTION);
    try {
      const question = await generateQuizQuestion(studyGuide, questionsAsked);
      setCurrentQuestion(question);
      setQuestionsAsked(prev => [...prev, question]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    
    setAppState(AppState.EVALUATING_ANSWER);
    setError(null);
    try {
      const evalFeedback = await evaluateAnswer(studyGuide, currentQuestion, userAnswer);
      setFeedback(evalFeedback);
      if (evalFeedback.evaluation === 'Correct') {
        setScore(prev => prev + 1);
      }
      setAppState(AppState.SHOWING_FEEDBACK);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleGetKeyPoints = async () => {
    if (keyPoints) {
      setKeyPoints('');
      return;
    }
    setSummary(''); // Hide summary if showing key points
    setAppState(AppState.GENERATING_KEY_POINTS);
    try {
      const points = await generateKeyPoints(studyGuide);
      setKeyPoints(points);
      setAppState(AppState.STUDYING);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleGetSummary = async () => {
    if (summary) {
      setSummary('');
      return;
    }
    setKeyPoints(''); // Hide key points if showing summary
    setAppState(AppState.GENERATING_SUMMARY);
    try {
      const result = await generateSummary(studyGuide);
      setSummary(result);
      setAppState(AppState.STUDYING);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    resetAllState();
    setTopic(item.topic);
    setStudyGuide(item.guide);
    setSources(item.sources);
    setAppState(AppState.STUDYING);
    scrollToTop();
  };
  
  const renderInitialView = () => (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-center text-slate-100">AI Study Buddy</h1>
      <p className="text-center text-slate-400 mt-2 mb-8">
        Enter a topic you want to learn about, and I'll generate a study guide and quiz for you.
      </p>
      <form onSubmit={handleTopicSubmit} className="flex items-center gap-2">
        <div className="relative flex-grow">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 'The French Revolution' or 'How do black holes work?'"
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-3 pl-10 pr-4 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
        <button type="submit" className="bg-cyan-500 text-white font-bold py-3 px-6 rounded-md hover:bg-cyan-600 transition-colors flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed" disabled={!topic.trim()}>
          <SparklesIcon className="h-5 w-5" />
          <span>Generate</span>
        </button>
      </form>
      {history.length > 0 && (
         <div className="mt-12">
           <h2 className="text-2xl font-semibold text-slate-200 mb-4">Study History</h2>
           <div className="space-y-2">
             {history.slice(0, 5).map((item, index) => (
               <button key={index} onClick={() => handleSelectHistoryItem(item)} className="w-full text-left p-3 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors">
                 <p className="text-slate-200 font-medium">{item.topic}</p>
               </button>
             ))}
           </div>
           {history.length > 5 && (
             <button onClick={() => setAppState(AppState.SHOWING_HISTORY)} className="text-cyan-400 mt-4 hover:underline">View All History</button>
           )}
         </div>
       )}
    </div>
  );

  const renderLoadingView = () => {
    let message = "Thinking...";
    switch(appState) {
        case AppState.GENERATING_GUIDE: message = "Generating your personalized study guide..."; break;
        case AppState.GENERATING_KEY_POINTS: message = "Extracting key points..."; break;
        case AppState.GENERATING_SUMMARY: message = "Creating a summary..."; break;
        case AppState.ASKING_QUESTION: message = "Coming up with a good question..."; break;
        case AppState.EVALUATING_ANSWER: message = "Evaluating your answer..."; break;
    }
    return <LoadingSpinner message={message} />;
  }
  
  const renderStudyGuideView = () => (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
       <button onClick={resetAllState} className="mb-6 text-cyan-400 hover:underline">
          &larr; Back to new topic
       </button>
      <h2 className="text-3xl font-bold text-slate-100 mb-4">{topic}</h2>
      <div className="p-6 bg-slate-800 rounded-lg prose prose-invert prose-slate max-w-none">
        <ReactMarkdown>{studyGuide}</ReactMarkdown>
      </div>

       {summary && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg animate-fade-in">
          <h3 className="text-xl font-semibold text-slate-200 mb-2">Summary</h3>
          <div className="prose prose-invert prose-slate max-w-none"><ReactMarkdown>{summary}</ReactMarkdown></div>
        </div>
      )}

      {keyPoints && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg animate-fade-in">
          <h3 className="text-xl font-semibold text-slate-200 mb-2">Key Points</h3>
          <div className="prose prose-invert prose-slate max-w-none"><ReactMarkdown>{keyPoints}</ReactMarkdown></div>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-slate-200 mb-2">Sources</h3>
          <ul className="space-y-2">
            {sources.map((source, index) => (
              <li key={index}>
                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 hover:underline">
                  <LinkIcon className="h-4 w-4" />
                  <span>{source.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <button onClick={handleStartQuiz} className="bg-cyan-500 text-white font-bold py-3 px-6 rounded-md hover:bg-cyan-600 transition-colors flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5" />
          <span>Start Quiz ({quizLength} Questions)</span>
        </button>
        <button onClick={handleGetSummary} className="bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-md hover:bg-slate-600 transition-colors">
          {summary ? "Hide Summary" : "Summarize"}
        </button>
        <button onClick={handleGetKeyPoints} className="bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-md hover:bg-slate-600 transition-colors">
          {keyPoints ? "Hide Key Points" : "Key Points"}
        </button>
      </div>
    </div>
  );

  const renderQuestionView = () => (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="text-sm text-slate-400 mb-2">
        Question {questionsAsked.length} / {quizLength} | Score: {score}
      </div>
      <div className="p-6 bg-slate-800 rounded-lg mb-6">
        <p className="text-lg text-slate-100">{currentQuestion}</p>
      </div>
      <form onSubmit={handleAnswerSubmit}>
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={5}
          className="w-full bg-slate-700 border border-slate-600 rounded-md p-4 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <div className="mt-4 flex justify-end">
          <button type="submit" className="bg-cyan-500 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-600 transition-colors flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed" disabled={!userAnswer.trim()}>
            <span>Submit Answer</span>
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
  
  const renderFeedbackView = () => {
    if (!feedback) return null;

    const isCorrect = feedback.evaluation === 'Correct';
    const isPartiallyCorrect = feedback.evaluation === 'Partially Correct';
    
    const feedbackColor = isCorrect
      ? 'text-green-400'
      : isPartiallyCorrect
      ? 'text-yellow-400'
      : 'text-red-400';
      
    const FeedbackIcon = isCorrect
      ? CheckCircleIcon
      : isPartiallyCorrect
      ? ExclamationCircleIcon
      : XCircleIcon;

    return (
        <div className="w-full max-w-3xl mx-auto animate-fade-in">
            <div className="text-sm text-slate-400 mb-2">
                Question {questionsAsked.length} / {quizLength} | Score: {score}
            </div>
            <div className="p-6 bg-slate-800 rounded-lg mb-6">
                <p className="text-lg text-slate-100">{currentQuestion}</p>
            </div>
            <div className="mb-6 p-4 bg-slate-700 border border-slate-600 rounded-lg">
                <p className="text-slate-300 italic">Your answer: "{userAnswer}"</p>
            </div>

            <div className={`p-6 rounded-lg ${isCorrect ? 'bg-green-900/50' : isPartiallyCorrect ? 'bg-yellow-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <FeedbackIcon className={`h-8 w-8 ${feedbackColor}`} />
                    <h3 className={`text-2xl font-bold ${feedbackColor}`}>{feedback.evaluation}</h3>
                </div>
                <p className="text-slate-200">{feedback.explanation}</p>
            </div>

            <div className="mt-6 flex justify-end">
                <button onClick={fetchNextQuestion} className="bg-cyan-500 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-600 transition-colors flex items-center gap-2">
                    <span>{questionsAsked.length >= quizLength ? 'Finish Quiz' : 'Next Question'}</span>
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
  };
  
  const renderQuizCompleteView = () => (
    <div className="w-full max-w-xl mx-auto text-center animate-fade-in">
      <h2 className="text-4xl font-bold text-slate-100">Quiz Complete!</h2>
      <p className="text-2xl text-slate-300 mt-4">
        Your final score is:
      </p>
      <p className="text-6xl font-bold text-cyan-400 my-6">
        {score} / {quizLength}
      </p>
      <div className="flex justify-center gap-4">
        <button onClick={handleStartQuiz} className="bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-2">
          <RefreshIcon className="h-5 w-5" />
          <span>Try Again</span>
        </button>
        <button onClick={resetAllState} className="bg-cyan-500 text-white font-bold py-3 px-6 rounded-md hover:bg-cyan-600 transition-colors">
          Study a New Topic
        </button>
      </div>
    </div>
  );

  const renderErrorView = () => (
    <div className="w-full max-w-xl mx-auto text-center animate-fade-in">
        <ExclamationCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-red-400">An Error Occurred</h2>
        <p className="text-slate-300 mt-4 bg-slate-800 p-4 rounded-md">{error}</p>
        <div className="mt-8 flex justify-center gap-4">
            <button onClick={resetAllState} className="bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-md hover:bg-slate-600 transition-colors">
                Back to Home
            </button>
        </div>
    </div>
  );
  
  const renderHistoryView = () => (
    <div className="w-full max-w-3xl mx-auto">
       <button onClick={() => setAppState(AppState.INITIAL)} className="mb-6 text-cyan-400 hover:underline">
          &larr; Back to Home
       </button>
      <h2 className="text-3xl font-bold text-slate-100 mb-6">Study History</h2>
      <div className="space-y-3">
        {history.map((item, index) => (
          <button key={index} onClick={() => handleSelectHistoryItem(item)} className="w-full text-left p-4 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors">
            <p className="text-slate-200 font-medium text-lg">{item.topic}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (appState) {
      case AppState.INITIAL: return renderInitialView();
      case AppState.GENERATING_GUIDE:
      case AppState.GENERATING_KEY_POINTS:
      case AppState.GENERATING_SUMMARY:
      case AppState.EVALUATING_ANSWER: return renderLoadingView();
      case AppState.STUDYING: return renderStudyGuideView();
      case AppState.ASKING_QUESTION: return questionsAsked.length > 0 ? renderQuestionView() : renderLoadingView();
      case AppState.SHOWING_FEEDBACK: return renderFeedbackView();
      case AppState.QUIZ_COMPLETE: return renderQuizCompleteView();
      case AppState.SHOWING_HISTORY: return renderHistoryView();
      case AppState.ERROR: return renderErrorView();
      default: return <p>Unknown state</p>;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-300 font-sans transition-colors ${darkMode ? 'dark' : ''}`}>
      <header className="py-4 px-8 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-8 w-8 text-cyan-400"/>
          <span className="text-xl font-bold text-slate-200">AI Study Buddy</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-800">
          {darkMode ? <SunIcon className="h-6 w-6 text-yellow-300" /> : <MoonIcon className="h-6 w-6 text-slate-400" />}
        </button>
      </header>
      <main ref={mainContentRef} className="p-8 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          <div className="flex items-center justify-center h-full">
            {renderContent()}
          </div>
      </main>
    </div>
  );
};

export default App;
