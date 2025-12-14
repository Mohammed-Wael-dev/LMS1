import React from "react";

type QAListSkeletonProps = {
  items?: number;
  repliesPerQuestion?: number;
  className?: string;
};

export default function QAListSkeleton({
  items = 3,
  repliesPerQuestion = 2,
  className = "",
}: QAListSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <QuestionCardSkeleton
          key={`q-skel-${i}`}
          replies={repliesPerQuestion}
        />
      ))}
    </div>
  );
}

const QuestionCardSkeleton: React.FC<{ replies: number }> = ({ replies }) => {
  return (
    <div className="bg-gray-900 rounded-lg p-5 border border-gray-700 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-purple-500" />
          <div>
            <div className="h-3 bg-gray-700 rounded w-36 mb-2" />
            <div className="h-3 bg-gray-700 rounded w-64" />
          </div>
        </div>
        <div className="h-6 w-14 bg-gray-700 rounded-full" />
      </div>

      {/* Actions */}
      <div className="ml-11 mb-4 flex items-center space-x-4">
        <div className="h-5 w-16 bg-gray-700 rounded-full" />
        <div className="h-5 w-20 bg-gray-700 rounded-full" />
      </div>

      {/* Replies */}
      <div className="ml-11 space-y-3">
        {Array.from({ length: replies }).map((_, idx) => (
          <ReplySkeleton key={`r-skel-${idx}`} />
        ))}
      </div>

      {/*
      <div className="mt-4 ml-11">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center mb-3">
            <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-500 mr-2" />
            <div className="h-3 bg-gray-700 rounded w-40" />
          </div>
          <div className="w-full h-24 bg-gray-700 rounded-lg" />
          <div className="flex justify-end space-x-3 mt-3">
            <div className="h-8 w-16 bg-gray-700 rounded-lg" />
            <div className="h-8 w-24 bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>
      */}
    </div>
  );
};

const ReplySkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-500" />
          <div className="h-3 bg-gray-700 rounded w-28" />
          <div className="h-5 w-16 bg-gray-700 rounded-full ml-2" />
        </div>
        <div className="h-6 w-12 bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded w-11/12" />
        <div className="h-3 bg-gray-700 rounded w-9/12" />
      </div>
      <div className="flex items-center space-x-3 mt-3">
        <div className="h-4 w-14 bg-gray-700 rounded-full" />
      </div>
    </div>
  );
};
