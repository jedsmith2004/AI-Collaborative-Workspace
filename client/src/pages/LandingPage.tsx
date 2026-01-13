import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Sparkles, MessageSquare, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, isLoading, login, signup } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <span className="text-xl font-bold tracking-tight text-white">AI Colab</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={login}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
            >
              Log in
            </button>
            <button
              onClick={signup}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/25"
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full border border-gray-700 text-sm text-gray-300 mb-8">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Real-time collaboration powered by AI
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Collaborate. Create.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Innovate.</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time collaborative notes with AI-powered insights. Work together with your team, 
            get intelligent suggestions, and chat in real-time — all in one beautiful workspace.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={signup}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/25"
            >
              Start for Free
              <ArrowRight size={18} />
            </button>
            <button
              onClick={login}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-gray-800 text-white rounded-xl border border-gray-700 hover:border-gray-600 hover:bg-gray-750 transition"
            >
              I have an account
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-800/50 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Everything you need to collaborate</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Powerful features designed for modern teams who want to work smarter, not harder.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-gray-800 border border-gray-700 hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Real-Time Collaboration</h3>
              <p className="text-gray-400 leading-relaxed">
                See your team's cursors as they type. Edit notes together in real-time with instant 
                synchronization across all devices.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-gray-800 border border-gray-700 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">AI-Powered Insights</h3>
              <p className="text-gray-400 leading-relaxed">
                Ask questions about your documents and get intelligent answers. Our RAG-powered AI 
                understands your workspace context.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-gray-800 border border-gray-700 hover:border-green-500/50 transition-all duration-300">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Live Team Chat</h3>
              <p className="text-gray-400 leading-relaxed">
                Discuss ideas with your team in real-time. Each workspace has its own chat channel 
                for seamless communication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
            <Zap size={48} className="mx-auto mb-6 text-indigo-400" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Ready to transform how your team works?
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join teams who are already collaborating smarter with AI Colab Workspace.
            </p>
            <button
              onClick={signup}
              className="px-10 py-4 text-lg font-semibold bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition shadow-lg"
            >
              Get Started for Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-800/50 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              <span className="text-lg font-semibold text-white">AI Colab Workspace</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Contact</a>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 AI Colab Workspace
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
