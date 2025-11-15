import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, XCircle, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  course: string;
}

interface QuizData {
  questions: QuizQuestion[];
}

interface QuizViewProps {
  courses: any[];
}

const QuizView = ({ courses }: QuizViewProps) => {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const generateQuiz = async () => {
    if (courses.length === 0) {
      toast({
        title: "No courses found",
        description: "Please sync with Canvas first to generate a quiz",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setQuiz(null);
    setSelectedAnswers({});
    setShowResults(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-weekly-quiz', {
        body: { courses }
      });

      if (error) throw error;

      if (data?.quiz) {
        setQuiz(data.quiz);
        toast({
          title: "Quiz generated!",
          description: `${data.quiz.questions.length} questions ready for you`
        });
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Failed to generate quiz",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (showResults) return; // Don't allow changes after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = () => {
    if (!quiz) return;
    
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quiz.questions.length) {
      toast({
        title: "Incomplete quiz",
        description: `Please answer all ${quiz.questions.length} questions before submitting`,
        variant: "destructive"
      });
      return;
    }

    setShowResults(true);
    
    const correctCount = quiz.questions.filter((q, i) => 
      selectedAnswers[i] === q.correctAnswer
    ).length;

    toast({
      title: "Quiz completed!",
      description: `You got ${correctCount} out of ${quiz.questions.length} correct`,
      variant: correctCount === quiz.questions.length ? "default" : "destructive"
    });
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const calculateScore = () => {
    if (!quiz) return { correct: 0, total: 0, percentage: 0 };
    const correct = quiz.questions.filter((q, i) => 
      selectedAnswers[i] === q.correctAnswer
    ).length;
    const total = quiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    return { correct, total, percentage };
  };

  const score = calculateScore();

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              <Brain className="w-6 h-6 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
              Weekly Review Quiz
            </h2>
            <p className="text-sm text-foreground/80 mt-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              Test your knowledge with AI-generated questions
            </p>
          </div>
          <Button
            onClick={generateQuiz}
            disabled={isLoading || courses.length === 0}
            className="backdrop-blur-sm bg-primary/80 hover:bg-primary"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New Quiz
              </>
            )}
          </Button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="backdrop-blur-md bg-background/20 border border-white/20 p-12 rounded-lg shadow-lg text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-foreground/70" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--foreground) / 0.3))' }} />
          <p className="text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            Sync with Canvas first to generate personalized quizzes
          </p>
        </div>
      )}

      {quiz && (
        <>
          {showResults && (
            <div className={`backdrop-blur-md border p-6 rounded-lg shadow-lg ${
              score.percentage >= 70 
                ? 'bg-success/20 border-success/30' 
                : 'bg-destructive/20 border-destructive/30'
            }`}>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Your Score: {score.percentage}%
                </h3>
                <p className="text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {score.correct} out of {score.total} correct
                </p>
                <Button onClick={handleReset} className="mt-4" variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => {
              const selectedAnswer = selectedAnswers[qIndex];
              const isAnswered = selectedAnswer !== undefined;
              const isCorrect = isAnswered && selectedAnswer === question.correctAnswer;
              const showExplanation = showResults && isAnswered;

              return (
                <div
                  key={qIndex}
                  className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-lg shadow-lg"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <Badge variant="outline" className="backdrop-blur-sm bg-background/30">
                      Question {qIndex + 1}
                    </Badge>
                    <Badge variant="secondary" className="backdrop-blur-sm bg-background/30">
                      {question.course}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    {question.question}
                  </h3>

                  <div className="space-y-3">
                    {question.options.map((option, oIndex) => {
                      const isSelected = selectedAnswer === oIndex;
                      const isCorrectOption = oIndex === question.correctAnswer;
                      const showCorrect = showResults && isCorrectOption;
                      const showIncorrect = showResults && isSelected && !isCorrect;

                      return (
                        <button
                          key={oIndex}
                          onClick={() => handleAnswerSelect(qIndex, oIndex)}
                          disabled={showResults}
                          className={`w-full p-4 rounded-lg border text-left transition-all ${
                            showCorrect
                              ? 'bg-success/20 border-success/40'
                              : showIncorrect
                              ? 'bg-destructive/20 border-destructive/40'
                              : isSelected
                              ? 'bg-primary/20 border-primary/40'
                              : 'backdrop-blur-sm bg-background/30 border-white/10 hover:bg-background/40'
                          } ${showResults ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                              {String.fromCharCode(65 + oIndex)}. {option}
                            </span>
                            {showCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-success" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--success) / 0.5))' }} />
                            )}
                            {showIncorrect && (
                              <XCircle className="w-5 h-5 text-destructive" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--destructive) / 0.5))' }} />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <div className={`mt-4 p-4 rounded-lg backdrop-blur-sm ${
                      isCorrect 
                        ? 'bg-success/10 border border-success/20' 
                        : 'bg-destructive/10 border border-destructive/20'
                    }`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--success) / 0.5))' }} />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--destructive) / 0.5))' }} />
                        )}
                        <div>
                          <p className="font-semibold text-foreground mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </p>
                          <p className="text-sm text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!showResults && quiz.questions.length > 0 && (
            <div className="flex justify-center">
              <Button
                onClick={handleSubmit}
                size="lg"
                className="backdrop-blur-sm bg-primary/80 hover:bg-primary"
                disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
              >
                Submit Quiz
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuizView;
