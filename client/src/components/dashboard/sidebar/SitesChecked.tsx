import React from 'react'

interface SitesCheckedProps {
    hasIssuesAtThisHour: boolean
    allSitesChecked: 'Yes' | 'No' | null
    handleAllSitesChecked: (value: 'Yes' | 'No') => void
    sitesCheckedDetails: string
    handleDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const SitesChecked: React.FC<SitesCheckedProps> = ({
    hasIssuesAtThisHour,
    allSitesChecked,
    handleAllSitesChecked,
    sitesCheckedDetails,
    handleDetailsChange,
}) => {
    return (
        <div className="pt-4 border-t border-gray-100 space-y-4">
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                    All sites checked?
                </label>
                {!hasIssuesAtThisHour && (
                    <p className="text-[10px] text-yellow-700 font-medium mb-2">
                        ⚠️ Log at least one issue first.
                    </p>
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleAllSitesChecked('Yes')}
                        disabled={!hasIssuesAtThisHour}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${!hasIssuesAtThisHour
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                            : allSitesChecked === 'Yes'
                                ? 'bg-white border-blue-500 text-blue-700'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Yes
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAllSitesChecked('No')}
                        disabled={!hasIssuesAtThisHour}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${!hasIssuesAtThisHour
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                            : allSitesChecked === 'No'
                                ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        No
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Which sites have you checked?
                </label>
                <input
                    type="text"
                    value={sitesCheckedDetails}
                    onChange={handleDetailsChange}
                    placeholder="e.g., Site 1 to Site 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    )
}

export default SitesChecked
