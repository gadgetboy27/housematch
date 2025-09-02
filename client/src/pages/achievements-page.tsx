import { useState } from "react";
import AchievementsModal from "@/components/achievements-modal";

export default function AchievementsPage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-gray-900">Your Achievements</h1>
        <p className="text-gray-600 max-w-md">
          Track your progress and unlock rewards as you explore properties and engage with our platform.
        </p>
        
        {/* The modal will open automatically when this page loads */}
        <AchievementsModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
        
        {/* Show a message when modal is closed */}
        {!isModalOpen && (
          <div className="mt-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200"
              data-testid="button-open-achievements"
            >
              View Achievements Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}