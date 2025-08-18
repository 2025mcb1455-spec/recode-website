import React, { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import BrowserOnly from "@docusaurus/BrowserOnly";
import { motion } from "framer-motion";
import {
  useCommunityStatsContext,
  CommunityStatsProvider,
} from "@site/src/lib/statsProvider";
import SlotCounter from "react-slot-counter";
import { useLocation, useHistory } from "@docusaurus/router";
import {
  githubService,
  GitHubDiscussion,
} from "@site/src/services/githubService";
import DiscussionCard from "@site/src/components/discussions/DiscussionCard";
import {
  Megaphone,
  Lightbulb,
  HelpCircle,
  Star,
  MessageCircle,
  Search,
  TrendingUp,
  Home,
  Trophy,
  Gift,
  Calendar,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import NavbarIcon from "@site/src/components/navbar/NavbarIcon";
import "@site/src/components/discussions/discussions.css";
import "./dashboard.css";

type DiscussionTab = "discussions" | "trending" | "unanswered";
type SortOption = "most_popular" | "latest" | "oldest";
type Category =
  | "all"
  | "announcements"
  | "ideas"
  | "q-a"
  | "show-and-tell"
  | "general";

interface LeaderboardEntry {
  rank: number;
  name: string;
  username?: string;
  avatar: string;
  contributions: number;
  repositories: number;
  achievements: string[];
  github_url: string;
  score?: number;
  streak?: number;
  postManTag?: boolean;
  web3hack?: boolean;
  weeklyContributions?: number;
  monthlyContributions?: number;
}

type FilterPeriod = "weekly" | "monthly" | "overall";

interface DashboardStats {
  totalContributors: number;
  totalRepositories: number;
  totalStars: number;
  totalForks: number;
  topContributors: LeaderboardEntry[];
}

interface RateLimitInfo {
  isLimited: boolean;
  resetTime?: number;
  remaining?: number;
  limit?: number;
}

const categories: Category[] = [
  "all",
  "announcements",
  "ideas",
  "q-a",
  "show-and-tell",
  "general",
];

const DashboardContent: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState<
    "home" | "discuss" | "leaderboard" | "giveaway" | "contributors"
  >("home");

  // Discussion state management
  const [activeDiscussionTab, setActiveDiscussionTab] =
    useState<DiscussionTab>("discussions");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [sortBy, setSortBy] = useState<SortOption>("most_popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [discussions, setDiscussions] = useState<GitHubDiscussion[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(true);
  const [discussionsError, setDiscussionsError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);

  // Close dashboard menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDashboardMenu && 
          !target.closest('.dashboard-mobile-menu') && 
          !target.closest('.dashboard-menu-btn')) {
        setShowDashboardMenu(false);
      }
    };

    if (showDashboardMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDashboardMenu]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [filteredLeaderboardData, setFilteredLeaderboardData] = useState<
    LeaderboardEntry[]
  >([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("monthly");
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    isLimited: false,
  });
  const [retryTimer, setRetryTimer] = useState<number | null>(null);

  useEffect(() => {
    // Set active tab based on URL hash
    if (location.hash === "#discuss") {
      setActiveTab("discuss");
    } else if (location.hash === "#leaderboard") {
      setActiveTab("leaderboard");
    } else if (location.hash === "#contributors") {
      setActiveTab("contributors");
    } else if (location.hash === "#giveaway") {
      setActiveTab("giveaway");
    } else {
      setActiveTab("home");
    }
  }, [location]);

  // Fetch discussions when discuss tab is active
  useEffect(() => {
    if (activeTab === "discuss") {
      fetchDiscussions();
    }
  }, [activeTab]);

  const fetchDiscussions = async () => {
    try {
      setDiscussionsLoading(true);
      setDiscussionsError(null);
      const discussionsData = await githubService.fetchDiscussions(20);
      setDiscussions(discussionsData);
    } catch (error) {
      console.error("Failed to fetch discussions:", error);
      setDiscussionsError(
        error instanceof Error ? error.message : "Failed to load discussions"
      );
    } finally {
      setDiscussionsLoading(false);
    }
  };

  // Fetch leaderboard data when leaderboard or contributors tab is active
  useEffect(() => {
    if (activeTab === "leaderboard" || activeTab === "contributors") {
      fetchLeaderboardData();
    }
  }, [activeTab]);

  // Discussion handlers
  const handleDiscussionTabChange = (tab: DiscussionTab) => {
    setActiveDiscussionTab(tab);
  };

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      all: null,
      announcements: <Megaphone size={14} />,
      ideas: <Lightbulb size={14} />,
      "q-a": <HelpCircle size={14} />,
      "show-and-tell": <Star size={14} />,
      general: <MessageCircle size={14} />,
    };
    return iconMap[category] || null;
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryMap = {
      all: "All",
      announcements: "Announcements",
      ideas: "Ideas",
      "q-a": "Q&A",
      "show-and-tell": "Show & Tell",
      general: "General",
    };
    return categoryMap[category] || category;
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as SortOption);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleNewDiscussion = () => {
    window.open(
      "https://github.com/recodehive/recode-website/discussions/new",
      "_blank"
    );
  };

  // Filter discussions based on current state and tab
  const getFilteredDiscussions = (discussions: GitHubDiscussion[]) => {
    return discussions
      .filter((discussion) => {
        // First apply tab filter
        switch (activeDiscussionTab) {
          case "trending":
            return discussion.reactions.total_count > 5; // Show discussions with more than 5 reactions
          case "unanswered":
            return discussion.comments === 0;
          default:
            return true;
        }
      })
      .filter((discussion) => {
        // Then apply category filter
        if (selectedCategory !== "all") {
          const categoryName = discussion.category.name.toLowerCase();
          const selectedCat = selectedCategory.toLowerCase();

          // Map GitHub discussion categories to our filter categories
          if (
            selectedCat === "q-a" &&
            (categoryName.includes("q&a") || categoryName.includes("question"))
          ) {
            return true;
          }
          if (
            selectedCat === "show-and-tell" &&
            categoryName.includes("show")
          ) {
            return true;
          }
          if (
            selectedCat === "announcements" &&
            categoryName.includes("announcement")
          ) {
            return true;
          }
          if (selectedCat === "ideas" && categoryName.includes("idea")) {
            return true;
          }
          if (
            selectedCat === "general" &&
            (categoryName.includes("general") ||
              categoryName.includes("discussion"))
          ) {
            return true;
          }

          return categoryName.includes(selectedCat);
        }
        return true;
      })
      .filter((discussion) => {
        // Then apply search filter
        if (searchQuery) {
          return (
            discussion.title
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            discussion.body.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Finally sort the results
        switch (sortBy) {
          case "latest":
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          case "oldest":
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );
          default:
            return b.reactions.total_count - a.reactions.total_count; // most_popular
        }
      });
  };

  const filteredDiscussions = React.useMemo(
    () => getFilteredDiscussions(discussions),
    [discussions, activeDiscussionTab, selectedCategory, searchQuery, sortBy]
  );

  // Rate limit timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rateLimitInfo.isLimited && rateLimitInfo.resetTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const resetTime = rateLimitInfo.resetTime * 1000;
        const timeLeft = Math.max(0, resetTime - now);

        if (timeLeft <= 0) {
          setRateLimitInfo({ isLimited: false });
          setRetryTimer(null);
        } else {
          setRetryTimer(Math.ceil(timeLeft / 1000));
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rateLimitInfo]);

  // Function to get GitHub headers with token if available
  const getGitHubHeaders = () => {
    return {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RecodeHive-Dashboard/1.0",
    };
  };

  // Function to fetch data with rate limit handling
  const fetchWithRateLimit = async (url: string): Promise<Response> => {
    try {
      const response = await fetch(url, {
        headers: getGitHubHeaders(),
      });

      // Check rate limit headers
      const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
      const rateLimitReset = response.headers.get("X-RateLimit-Reset");
      const rateLimitLimit = response.headers.get("X-RateLimit-Limit");

      // Handle rate limit more gracefully
      if (response.status === 403) {
        const resetTime = parseInt(rateLimitReset || "0");
        setRateLimitInfo({
          isLimited: true,
          resetTime,
          remaining: parseInt(rateLimitRemaining || "0"),
          limit: parseInt(rateLimitLimit || "60"),
        });
        throw new Error("GitHub API rate limit exceeded. Using cached data.");
      }

      // Update rate limit info for display
      if (rateLimitRemaining && rateLimitLimit) {
        setRateLimitInfo({
          isLimited: false,
          remaining: parseInt(rateLimitRemaining),
          limit: parseInt(rateLimitLimit),
        });
      }

      return response;
    } catch (error) {
      // More specific error handling
      if (error.message.includes("rate limit")) {
        throw error;
      }

      // Generic network error
      console.warn("Network error, falling back to demo data:", error);
      throw new Error(`Unable to fetch live data. Showing demo data instead.`);
    }
  };

  // Function to simulate weekly/monthly contribution data
  const generateContributionData = (totalContributions: number) => {
    // Simulate weekly contributions (10-30% of total)
    const weeklyContributions = Math.floor(
      totalContributions * (0.1 + Math.random() * 0.2)
    );
    // Simulate monthly contributions (30-60% of total)
    const monthlyContributions = Math.floor(
      totalContributions * (0.3 + Math.random() * 0.3)
    );

    return {
      weeklyContributions,
      monthlyContributions,
    };
  };

  // Filter leaderboard data based on selected period
  const filterLeaderboardData = (
    data: LeaderboardEntry[],
    period: FilterPeriod
  ) => {
    let sortedData = [...data];

    switch (period) {
      case "weekly":
        sortedData.sort(
          (a, b) => (b.weeklyContributions || 0) - (a.weeklyContributions || 0)
        );
        break;
      case "monthly":
        sortedData.sort(
          (a, b) =>
            (b.monthlyContributions || 0) - (a.monthlyContributions || 0)
        );
        break;
      case "overall":
      default:
        sortedData.sort((a, b) => b.contributions - a.contributions);
        break;
    }

    // Update ranks based on filtered sorting
    return sortedData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  };

  // Update filtered data when period or data changes
  useEffect(() => {
    const filtered = filterLeaderboardData(leaderboardData, filterPeriod);
    setFilteredLeaderboardData(filtered);
  }, [leaderboardData, filterPeriod]);

  const fetchLeaderboardData = async () => {
    if (rateLimitInfo.isLimited) {
      setLeaderboardError(
        "Rate limit exceeded. Please wait before trying again."
      );
      return;
    }

    setIsLoadingLeaderboard(true);
    setLeaderboardError(null);

    try {
      console.log('Fetching leaderboard data from RecodeHive GitHub API...');

      // Fetch all repositories from RecodeHive organization
      const reposResponse = await fetch('https://api.github.com/orgs/recodehive/repos?type=public&per_page=100');

      if (!reposResponse.ok) {
        if (reposResponse.status === 403) {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw new Error(`GitHub API request failed: ${reposResponse.status}`);
      }

      const repos = await reposResponse.json();

      if (!Array.isArray(repos)) {
        throw new Error("Invalid GitHub API response format");
      }

      // Collect all contributors from all repositories (limit to avoid rate limits)
      const contributorsMap = new Map<
        string,
        {
          login: string;
          avatar_url: string;
          html_url: string;
          contributions: number;
          repositories: number;
          weeklyContributions: number;
          monthlyContributions: number;
        }
      >();

      // Process only top repositories to avoid rate limits
      const topRepos = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 10); // Limit to top 10 repos to reduce API calls

      // Fetch contributors for each repository with delay to avoid rate limits
      for (let i = 0; i < topRepos.length; i++) {
        const repo = topRepos[i];
        try {
          // Add delay between requests to avoid hitting rate limits
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const contributorsResponse = await fetchWithRateLimit(
            `https://api.github.com/repos/${repo.full_name}/contributors?per_page=100`
          );

          if (contributorsResponse.ok) {
            const contributors = await contributorsResponse.json();

            if (Array.isArray(contributors)) {
              contributors.forEach((contributor) => {
                if (contributor.login && contributor.type === "User") {
                  const existing = contributorsMap.get(contributor.login);
                  const contributionData = generateContributionData(
                    contributor.contributions
                  );

                  if (existing) {
                    existing.contributions += contributor.contributions;
                    existing.repositories += 1;
                    existing.weeklyContributions +=
                      contributionData.weeklyContributions;
                    existing.monthlyContributions +=
                      contributionData.monthlyContributions;
                  } else {
                    contributorsMap.set(contributor.login, {
                      login: contributor.login,
                      avatar_url: contributor.avatar_url,
                      html_url: contributor.html_url,
                      contributions: contributor.contributions,
                      repositories: 1,
                      weeklyContributions: contributionData.weeklyContributions,
                      monthlyContributions:
                        contributionData.monthlyContributions,
                    });
                  }
                }
              });
            }
          }
        } catch (error) {
          console.warn(`Error fetching contributors for ${repo.name}:`, error);
          if (error.message.includes("rate limit")) {
            // Stop processing if we hit rate limit
            break;
          }
        }
      }

      // Transform contributors data to match our LeaderboardEntry interface
      const transformedData: LeaderboardEntry[] = Array.from(
        contributorsMap.values()
      )
        .filter((contributor) => contributor.contributions > 0)
        .map((contributor, index) => {
          const score = contributor.contributions * 10; // Convert contributions to score
          const achievements = generateAchievements(
            score,
            contributor.contributions
          );

          return {
            rank: index + 1,
            name: contributor.login,
            username: contributor.login,
            avatar: contributor.avatar_url,
            contributions: contributor.contributions,
            repositories: contributor.repositories,
            score,
            achievements,
            github_url: contributor.html_url,
            streak: Math.floor(Math.random() * 10) + 1, // Random streak for demo
            postManTag: false,
            web3hack: false,
            weeklyContributions: contributor.weeklyContributions,
            monthlyContributions: contributor.monthlyContributions,
          };
        })
        .sort((a, b) => b.contributions - a.contributions) // Sort by contributions descending
        .map((item, index) => ({ ...item, rank: index + 1 })); // Update ranks after sorting

      setLeaderboardData(transformedData);
    } catch (error) {
      console.error("Error fetching RecodeHive contributors data:", error);
      setLeaderboardError(error.message);

      // Load fallback demo data
      console.warn("Using fallback leaderboard data due to GitHub API limitations");
      setLeaderboardError("GitHub API rate limit reached. Showing demo data.");
      const demoData: LeaderboardEntry[] = [
        {
          rank: 1,
          name: "sanjay-kv",
          username: "sanjay-kv",
          avatar: "https://avatars.githubusercontent.com/u/30715153?v=4",
          contributions: 250,
          repositories: 25,
          score: 2500,
          achievements: ["Top Contributor", "Founder", "Maintainer"],
          github_url: "https://github.com/sanjay-kv",
          streak: 15,
          postManTag: false,
          web3hack: false,
          weeklyContributions: 35,
          monthlyContributions: 120,
        },
        {
          rank: 2,
          name: "vansh-codes",
          username: "vansh-codes",
          avatar: "https://avatars.githubusercontent.com/u/114163734?v=4",
          contributions: 180,
          repositories: 22,
          score: 1800,
          achievements: ["Rising Star", "Active Contributor", "Star Contributor"],
          github_url: "https://github.com/vansh-codes",
          streak: 8,
          postManTag: false,
          web3hack: false,
          weeklyContributions: 25,
          monthlyContributions: 85,
        },
        {
          rank: 3,
          name: "Hemu21",
          username: "Hemu21",
          avatar: "https://avatars.githubusercontent.com/u/106808387?v=4",
          contributions: 120,
          repositories: 18,
          score: 1200,
          achievements: ["Power User", "Star Contributor", "Consistent"],
          github_url: "https://github.com/Hemu21",
          streak: 5,
          postManTag: false,
          web3hack: false,
          weeklyContributions: 18,
          monthlyContributions: 60,
        },
      ];
      setLeaderboardData(demoData);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const generateAchievements = (
    score: number,
    contributions: number
  ): string[] => {
    const achievements: string[] = [];
    if (score >= 5000) achievements.push("Elite Contributor");
    if (score >= 3000) achievements.push("Master Contributor");
    if (score >= 1000) achievements.push("Advanced Contributor");
    if (score >= 500) achievements.push("Active Contributor");
    if (score >= 100) achievements.push("Rising Star");
    if (contributions >= 100) achievements.push("Century Club");
    if (contributions >= 50) achievements.push("Half Century");
    if (contributions >= 25) achievements.push("Quick Contributor");
    if (contributions >= 10) achievements.push("Consistent");
    if (score >= 7000) achievements.push("Legend");
    if (contributions >= 150) achievements.push("PR Master");
    return achievements.slice(0, 3);
  };

  const handleTabChange = (
    tab: "home" | "discuss" | "leaderboard" | "giveaway" | "contributors"
  ) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false); // Close mobile sidebar
    setShowDashboardMenu(false); // Close dashboard menu
    if (tab === "discuss") {
      history.push("#discuss");
      window.scrollTo(0, 0);
    } else if (tab === "leaderboard") {
      history.push("#leaderboard");
      window.scrollTo(0, 0);
    } else if (tab === "giveaway") {
      history.push("/dashboard/giveaway");
    } else if (tab === "contributors") {
      history.push("#contributors");
      window.scrollTo(0, 0);
    } else {
      history.push("#");
    }
  };

  // Filter functions
  const handleFilterChange = (period: FilterPeriod) => {
    setFilterPeriod(period);
  };

  const getContributionCount = (
    entry: LeaderboardEntry,
    period: FilterPeriod
  ) => {
    switch (period) {
      case "weekly":
        return entry.weeklyContributions || 0;
      case "monthly":
        return entry.monthlyContributions || 0;
      case "overall":
      default:
        return entry.contributions;
    }
  };

  const FilterButtons = () => (
    <motion.div
      className="leaderboard-filters"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <button
        className={`filter-button ${
          filterPeriod === "weekly" ? "active" : ""
        } ${
          isLoadingLeaderboard || rateLimitInfo.isLimited
            ? "filter-loading"
            : ""
        }`}
        onClick={() => handleFilterChange("weekly")}
        disabled={isLoadingLeaderboard || rateLimitInfo.isLimited}
      >
        <Calendar size={16} />
        Weekly
      </button>
      <button
        className={`filter-button ${
          filterPeriod === "monthly" ? "active" : ""
        } ${
          isLoadingLeaderboard || rateLimitInfo.isLimited
            ? "filter-loading"
            : ""
        }`}
        onClick={() => handleFilterChange("monthly")}
        disabled={isLoadingLeaderboard || rateLimitInfo.isLimited}
      >
        <BarChart3 size={16} />
        Monthly
      </button>
      <button
        className={`filter-button ${
          filterPeriod === "overall" ? "active" : ""
        } ${
          isLoadingLeaderboard || rateLimitInfo.isLimited
            ? "filter-loading"
            : ""
        }`}
        onClick={() => handleFilterChange("overall")}
        disabled={isLoadingLeaderboard || rateLimitInfo.isLimited}
      >
        <Trophy size={16} />
        Overall
      </button>
    </motion.div>
  );

  const RateLimitWarning = () =>
    rateLimitInfo.isLimited ? (
      <motion.div
        className="rate-limit-warning"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h4>GitHub API Rate Limit Reached</h4>
        <p>
          We've temporarily reached the GitHub API rate limit. The leaderboard
          will automatically refresh when the limit resets.
        </p>
        {retryTimer && (
          <div className="rate-limit-timer">
            Retry in: {Math.floor(retryTimer / 60)}:
            {(retryTimer % 60).toString().padStart(2, "0")}
          </div>
        )}

      </motion.div>
    ) : rateLimitInfo.remaining && rateLimitInfo.remaining < 20 ? (
      <motion.div
        className="rate-limit-warning"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h4>API Rate Limit Low</h4>
        <p>
          GitHub API requests remaining: {rateLimitInfo.remaining}/
          {rateLimitInfo.limit}
        </p>
      </motion.div>
    ) : null;

  // Rest of your component code remains the same...
  const {
    githubStarCount,
    githubStarCountText,
    githubContributorsCount,
    githubContributorsCountText,
    githubForksCount,
    githubForksCountText,
    githubReposCount,
    githubReposCountText,
    loading,
    error,
  } = useCommunityStatsContext();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalContributors: 0,
    totalRepositories: 0,
    totalStars: 0,
    totalForks: 0,
    topContributors: [],
  });

  useEffect(() => {
    setDashboardStats({
      totalContributors: githubContributorsCount,
      totalRepositories: githubReposCount,
      totalStars: githubStarCount,
      totalForks: githubForksCount,
      topContributors: leaderboardData.slice(0, 4),
    });
  }, [
    githubContributorsCount,
    githubReposCount,
    githubStarCount,
    githubForksCount,
    leaderboardData,
  ]);

  const StatCard: React.FC<{
    icon: string;
    title: string;
    value: number;
    valueText: string;
    description: string;
  }> = ({ icon, title, value, valueText, description }) => (
    <motion.div
      className="dashboard-stat-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="dashboard-stat-icon">{icon}</div>
      <div className="dashboard-stat-content">
        <h3 className="dashboard-stat-title">{title}</h3>
        <div className="dashboard-stat-value">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <SlotCounter
              value={valueText}
              autoAnimationStart={true}
              duration={1}
            />
          )}
        </div>
        <p className="dashboard-stat-description">{description}</p>
      </div>
    </motion.div>
  );

  const LeaderboardCard: React.FC<{
    entry: LeaderboardEntry;
    index: number;
  }> = ({ entry, index }) => (
    <motion.div
      className="leaderboard-card"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.01, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
    >
      <div className="leaderboard-rank">
        <span className={`rank-badge rank-${entry.rank}`}>#{entry.rank}</span>
      </div>
      <div className="leaderboard-avatar">
        <img src={entry.avatar} alt={entry.name} />
      </div>
      <div className="leaderboard-info">
        <h4 className="leaderboard-name">{entry.name}</h4>
        <div className="leaderboard-stats">
          <span className="stat-item">
            <strong>{entry.contributions}</strong> Contributions
          </span>
          <span className="stat-item">
            <strong>{entry.repositories}</strong> Repositories
          </span>
        </div>
        <div className="leaderboard-achievements">
          {entry.achievements.map((achievement, i) => (
            <span key={i} className="achievement-badge">
              {achievement}
            </span>
          ))}
        </div>
      </div>
      <div className="leaderboard-actions">
        <a
          href={entry.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="github-profile-btn"
        >
          View Profile
        </a>
      </div>
    </motion.div>
  );

  return (
    <div className="dashboard-layout">
        {/* Dashboard Menu Button - Only visible on mobile */}
        <button
          className={`dashboard-menu-btn ${showDashboardMenu ? "open" : ""}`}
          onClick={() => setShowDashboardMenu(!showDashboardMenu)}
          aria-label="Toggle dashboard menu"
        >
          {showDashboardMenu ? "✕" : "☰"}
        </button>
        
        {/* Dashboard Mobile Menu */}
        <div className={`dashboard-mobile-menu ${showDashboardMenu ? "show" : ""}`}>
          {/* Overlay */}
          {showDashboardMenu && (
            <div 
              className="dashboard-menu-overlay"
              onClick={() => setShowDashboardMenu(false)}
            />
          )}
          <div className="dashboard-menu-header">
            <h3>Dashboard Menu</h3>
            <button
              className="close-menu-btn"
              onClick={() => setShowDashboardMenu(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          

          {/* Dashboard navigation items */}
          <div className="dashboard-menu-items">
            <div
              className={`menu-item ${activeTab === "home" ? "active" : ""}`}
              onClick={() => {
                handleTabChange("home");
                setShowDashboardMenu(false);
              }}
            >
              <span className="menu-icon">
                <Home size={18} />
              </span>
              <span className="menu-text">Home</span>
            </div>
            <div
              className={`menu-item ${activeTab === "discuss" ? "active" : ""}`}
              onClick={() => {
                handleTabChange("discuss");
                setShowDashboardMenu(false);
              }}
            >
              <span className="menu-icon">
                <MessageCircle size={18} />
              </span>
              <span className="menu-text">Discuss</span>
            </div>
            <div
              className={`menu-item ${
                activeTab === "leaderboard" ? "active" : ""
              }`}
              onClick={() => {
                handleTabChange("leaderboard");
                setShowDashboardMenu(false);
              }}
            >
              <span className="menu-icon">
                <Trophy size={18} />
              </span>
              <span className="menu-text">Leaderboard</span>
            </div>
            <div
              className={`menu-item ${activeTab === "giveaway" ? "active" : ""}`}
              onClick={() => {
                handleTabChange("giveaway");
                setShowDashboardMenu(false);
              }}
            >
              <span className="menu-icon">
                <Gift size={18} />
              </span>
              <span className="menu-text">Giveaway</span>
            </div>
            <div
              className={`menu-item ${
                activeTab === "contributors" ? "active" : ""
              }`}
              onClick={() => {
                handleTabChange("contributors");
                setShowDashboardMenu(false);
              }}
            >
              <span className="menu-icon">
                <NavbarIcon name="Community" />
              </span>
              <span className="menu-text">Contributors</span>
            </div>
          </div>
        </div>
        
        {/* Sidebar Navigation - Hidden on mobile */}
        <nav
          className={`dashboard-sidebar ${
            isSidebarCollapsed ? "collapsed" : ""
          }`}
        >
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <h2>RecodeHive</h2>
            </div>
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {isSidebarCollapsed ? "→" : "←"}
            </button>
          </div>
          <ul className="sidebar-nav">
            <li
              className={`nav-item ${activeTab === "home" ? "active" : ""}`}
              onClick={() => handleTabChange("home")}
            >
              <span className="nav-icon">
                <Home size={18} />
              </span>
              <span className="nav-text">Home</span>
            </li>
            <li
              className={`nav-item ${activeTab === "discuss" ? "active" : ""}`}
              onClick={() => handleTabChange("discuss")}
            >
              <span className="nav-icon">
                <MessageCircle size={18} />
              </span>
              <span className="nav-text">Discuss</span>
            </li>
            <li
              className={`nav-item ${
                activeTab === "leaderboard" ? "active" : ""
              }`}
              onClick={() => handleTabChange("leaderboard")}
            >
              <span className="nav-icon">
                <Trophy size={18} />
              </span>
              <span className="nav-text">Leaderboard</span>
            </li>
            <li
              className={`nav-item ${activeTab === "giveaway" ? "active" : ""}`}
              onClick={() => handleTabChange("giveaway")}
            >
              <span className="nav-icon">
                <Gift size={18} />
              </span>
              <span className="nav-text">Giveaway</span>
            </li>
            <li
              className={`nav-item ${
                activeTab === "contributors" ? "active" : ""
              }`}
              onClick={() => handleTabChange("contributors")}
            >
              <span className="nav-icon">
                <NavbarIcon name="Community" />
              </span>
              <span className="nav-text">Contributors</span>
            </li>
          </ul>
          <div className="sidebar-footer">
            <button
              className="sidebar-toggle bottom-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {isSidebarCollapsed ? "→" : "←"}
            </button>
          </div>
        </nav>

        <main
          className={`dashboard-main ${
            activeTab === "discuss" ? "discuss-view" : ""
          } ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}
          onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
        >
          {activeTab === "leaderboard" ? (
            /* Leaderboard Tab */
            <motion.section
              className="dashboard-hero"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="hero-content">
                <h1 className="dashboard-title">
                  RecodeHive <span className="highlight">Leaderboard</span>
                </h1>
                <p className="dashboard-subtitle">Coming soon...</p>
              </div>
            </motion.section>
          ) : activeTab === "home" ? (
            // Home tab content
            <div>
              <motion.section
                className="dashboard-hero"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="hero-content">
                  <h1 className="dashboard-title">
                    Community <span className="highlight">Dashboard</span>
                  </h1>
                  <p className="dashboard-subtitle">
                    Track our community's growth, celebrate top contributors,
                    and explore project statistics
                  </p>
                </div>
              </motion.section>

              {/* Stats Grid */}
              <motion.section
                className="dashboard-stats-section"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="dashboard-stats-grid">
                  <StatCard
                    icon="⭐"
                    title="Total Stars"
                    value={dashboardStats.totalStars}
                    valueText={githubStarCountText}
                    description="Stars across all repositories"
                  />
                  <StatCard
                    icon="👥"
                    title="Contributors"
                    value={dashboardStats.totalContributors}
                    valueText={githubContributorsCountText}
                    description="Amazing community members"
                  />
                  <StatCard
                    icon="📚"
                    title="Repositories"
                    value={dashboardStats.totalRepositories}
                    valueText={githubReposCountText}
                    description="Open source projects"
                  />
                  <StatCard
                    icon="🍴"
                    title="Forks"
                    value={dashboardStats.totalForks}
                    valueText={githubForksCountText}
                    description="Community contributions"
                  />
                </div>
              </motion.section>

              {/* Leaderboard Section */}
              <motion.section
                className="dashboard-leaderboard-section"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="leaderboard-header">
                  <h2 className="leaderboard-title">
                    Top Contributors <span className="title-accent">Leaderboard</span>
                  </h2>
                  <p className="leaderboard-description">
                    Celebrating our most active community members who make
                    RecodeHive awesome!
                  </p>
                </div>

                <div className="leaderboard-container">
                  {error && (
                    <div className="error-message">
                      <p>Some data may be cached or incomplete</p>
                    </div>
                  )}

                  {dashboardStats.topContributors.map((entry, index) => (
                    <LeaderboardCard
                      key={entry.rank}
                      entry={entry}
                      index={index}
                    />
                  ))}
                </div>
              </motion.section>

              {/* Call to Action */}
              <motion.section
                className="dashboard-cta"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="cta-content">
                  <h3>Want to see your name here?</h3>
                  <p>
                    Join our community and start contributing to open source
                    projects!
                  </p>
                  <div className="cta-buttons">
                    <a
                      href="https://github.com/recodehive"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cta-primary"
                    >
                      Start Contributing
                    </a>
                    <a href="/community" className="cta-secondary">
                      Join Community
                    </a>
                  </div>
                </div>
              </motion.section>
            </div>
          ) : activeTab === "discuss" ? (
            <motion.div
              className="discussion-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <h1
                  style={{
                    fontSize: "3.5rem",
                    fontWeight: "800",
                    marginBottom: "1rem",
                    color: "var(--ifm-color-emphasis-900)",
                  }}
                >
                  Community{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, var(--ifm-color-primary), #e74c3c)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Discussions
                  </span>
                </h1>
                <p
                  style={{
                    fontSize: "1.2rem",
                    color: "var(--ifm-color-emphasis-700)",
                    maxWidth: "700px",
                    margin: "0 auto",
                    lineHeight: "1.6",
                  }}
                >
                  Join the conversation, ask questions, and share your thoughts
                  with the RecodeHive community.
                </p>
              </div>

              <div className="discussion-tabs">
                <div className="tabs-left">
                  <button
                    className={`tab-btn ${
                      activeDiscussionTab === "discussions" ? "active" : ""
                    }`}
                    onClick={() => handleDiscussionTabChange("discussions")}
                  >
                    All Discussions
                  </button>
                  <button
                    className={`tab-btn ${
                      activeDiscussionTab === "trending" ? "active" : ""
                    }`}
                    onClick={() => handleDiscussionTabChange("trending")}
                  >
                    <TrendingUp size={16} /> Trending
                  </button>
                  <button
                    className={`tab-btn ${
                      activeDiscussionTab === "unanswered" ? "active" : ""
                    }`}
                    onClick={() => handleDiscussionTabChange("unanswered")}
                  >
                    <HelpCircle size={16} /> Unanswered
                  </button>
                </div>
                <button
                  className="new-discussion-btn"
                  onClick={handleNewDiscussion}
                >
                  + New Discussion
                </button>
              </div>

              <div className="category-filters">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-filter ${
                      selectedCategory === category ? "active" : ""
                    }`}
                    onClick={() => handleCategoryChange(category)}
                  >
                    {getCategoryIcon(category)}
                    {getCategoryDisplayName(category)}
                  </button>
                ))}
              </div>

              <div className="search-sort-container">
                <div className="search-wrapper">
                  <Search className="search-icon" size={20} />
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="search-field"
                  />
                </div>
                <div className="sort-wrapper">
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="sort-select"
                  >
                    <option value="most_popular">Most Popular</option>
                    <option value="latest">Latest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>

              <div className="discussions-count">
                <span>
                  {filteredDiscussions.length} discussion
                  {filteredDiscussions.length !== 1 ? "s" : ""} found
                </span>
              </div>

              {discussionsLoading ? (
                <div className="discussions-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading discussions...</p>
                </div>
              ) : discussionsError ? (
                <div className="discussions-error">
                  <div className="error-icon">!</div>
                  <h3>Unable to load discussions</h3>
                  <p>{discussionsError}</p>
                  <button className="retry-button" onClick={fetchDiscussions}>
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="discussions-grid">
                    {filteredDiscussions.length > 0 ? (
                      filteredDiscussions.map((discussion, index) => (
                        <DiscussionCard
                          key={discussion.id}
                          discussion={discussion}
                          index={index}
                        />
                      ))
                    ) : (
                      <div className="no-discussions">
                        <div className="no-discussions-icon">No discussions</div>
                        <h3>No discussions found</h3>
                        <p>
                          {searchQuery || selectedCategory !== "all"
                            ? "Try adjusting your filters or search terms."
                            : "Be the first to start a discussion!"}
                        </p>
                        <a
                          href="https://github.com/recodehive/recode-website/discussions/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="start-discussion-btn"
                        >
                          Start a Discussion
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Community Engagement Section */}
                  <div className="community-cta-box" style={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)", 
                    padding: "2.5rem 2rem", 
                    borderRadius: "16px", 
                    marginTop: "3rem", 
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                    color: "white"
                  }}>
                    <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem", color: "white" }}>
                      💬 Join the Conversation
                    </h2>
                    <p style={{ fontSize: "1.1rem", marginBottom: "2rem", color: "rgba(255,255,255,0.9)", maxWidth: "500px", margin: "0 auto 2rem" }}>
                      Connect with our community! Share ideas, ask questions, and showcase your amazing work.
                    </p>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                      <motion.a 
                        href="https://github.com/recodehive/recode-website/discussions/new?category=q-a" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          background: "rgba(255,255,255,0.2)", 
                          color: "white", 
                          padding: "0.875rem 1.5rem", 
                          borderRadius: "10px", 
                          textDecoration: "none", 
                          fontWeight: "600", 
                          fontSize: "0.95rem",
                          border: "1px solid rgba(255,255,255,0.3)",
                          display: "inline-block"
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ❓ Ask Question
                      </motion.a>
                      <motion.a 
                        href="https://github.com/recodehive/recode-website/discussions/new?category=ideas" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          background: "rgba(255,255,255,0.2)", 
                          color: "white", 
                          padding: "0.875rem 1.5rem", 
                          borderRadius: "10px", 
                          textDecoration: "none", 
                          fontWeight: "600", 
                          fontSize: "0.95rem",
                          border: "1px solid rgba(255,255,255,0.3)",
                          display: "inline-block"
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        💡 Share Idea
                      </motion.a>
                      <motion.a 
                        href="https://github.com/recodehive/recode-website/discussions/new?category=show-and-tell" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          background: "rgba(255,255,255,0.2)", 
                          color: "white", 
                          padding: "0.875rem 1.5rem", 
                          borderRadius: "10px", 
                          textDecoration: "none", 
                          fontWeight: "600", 
                          fontSize: "0.95rem",
                          border: "1px solid rgba(255,255,255,0.3)",
                          display: "inline-block"
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        🎉 Show Work
                      </motion.a>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : activeTab === "giveaway" ? (
            /* Giveaway Tab - Empty for now */
            <div className="leaderboard-page-container">
              <motion.div
                className="leaderboard-page-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="leaderboard-page-title">
                  <span className="highlight">Giveaway</span>
                </h1>
              </motion.div>
            </div>
          ) : activeTab === "contributors" ? (
            /* Contributors Tab - Shows the list of contributors */
            <div className="leaderboard-page-container">
              <motion.div
                className="leaderboard-page-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="leaderboard-page-title">
                  RecodeHive <span className="highlight">Contributors</span>
                </h1>
                <p className="leaderboard-page-subtitle">
                  Live rankings from RecodeHive GitHub Organization • Updated
                  automatically
                </p>

                {/* Header Controls: Refresh Button + Filter Buttons */}
                <div className="leaderboard-header-controls">
                  <div className="refresh-section">
                    <button
                      onClick={fetchLeaderboardData}
                      disabled={isLoadingLeaderboard || rateLimitInfo.isLimited}
                      className="refresh-button"
                    >
                      {isLoadingLeaderboard
                        ? "Loading..."
                        : "Refresh Data"}
                    </button>
                    {rateLimitInfo.remaining && (
                      <p
                        className="rate-limit-status"
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          color: "var(--ifm-color-emphasis-600)",
                        }}
                      >
                        API calls remaining: {rateLimitInfo.remaining}/
                        {rateLimitInfo.limit}
                      </p>
                    )}
                  </div>

                  {/* Filter Buttons positioned to the right */}
                  <FilterButtons />
                </div>
              </motion.div>

              {/* Rate Limit Warning */}
              <RateLimitWarning />

              {/* Loading State */}
              {isLoadingLeaderboard && (
                <motion.div
                  className="loading-container"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="loading-spinner-large">Loading...</div>
                  <p className="loading-text">
                    Fetching latest contributor data...
                  </p>
                </motion.div>
              )}

              {/* Error State */}
              {leaderboardError && !isLoadingLeaderboard && (
                <motion.div
                  className="error-container"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="error-icon">!</div>
                  <h3>Unable to Load Latest Data</h3>
                  <p>{leaderboardError}</p>
                  {!rateLimitInfo.isLimited && (
                    <button
                      onClick={fetchLeaderboardData}
                      className="retry-button"
                    >
                      Try Again
                    </button>
                  )}
                  <p className="error-help">
                    Showing cached data below. The leaderboard will
                    automatically refresh when possible.
                  </p>
                </motion.div>
              )}

              {/* Contributors Content */}
              {!isLoadingLeaderboard && filteredLeaderboardData.length > 0 && (
                <motion.div
                  className="leaderboard-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <div className="leaderboard-stats">
                    <div className="stat-item">
                      <span className="stat-number">
                        {filteredLeaderboardData.length}
                      </span>
                      <span className="stat-label">Contributors</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {getContributionCount(
                          filteredLeaderboardData[0],
                          filterPeriod
                        ) || 0}
                      </span>
                      <span className="stat-label">
                        Top{" "}
                        {filterPeriod.charAt(0).toUpperCase() +
                          filterPeriod.slice(1)}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {Math.round(
                          filteredLeaderboardData.reduce(
                            (acc, user) =>
                              acc + getContributionCount(user, filterPeriod),
                            0
                          ) / filteredLeaderboardData.length
                        )}
                      </span>
                      <span className="stat-label">
                        Avg{" "}
                        {filterPeriod.charAt(0).toUpperCase() +
                          filterPeriod.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="leaderboard-grid">
                    {filteredLeaderboardData.map((entry, index) => (
                      <motion.div
                        key={entry.rank}
                        className="leaderboard-item"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                        }}
                      >
                        {/* Streak Display */}
                        {entry.streak && entry.streak > 1 && (
                          <div className="streak-display">
                            {entry.streak} Day Streak
                          </div>
                        )}

                        <div className="rank-section">
                          <div
                            className={`rank-badge ${
                              entry.rank <= 3
                                ? `rank-${entry.rank}`
                                : "rank-other"
                            }`}
                          >
                            #{entry.rank}
                          </div>
                        </div>

                        <div className="avatar-section">
                          <img
                            src={entry.avatar}
                            alt={entry.name}
                            className="user-avatar"
                            loading="lazy"
                          />
                        </div>

                        <div className="user-info">
                          <h3 className="user-name">{entry.name}</h3>
                          {entry.username && entry.username !== entry.name && (
                            <p className="user-username">@{entry.username}</p>
                          )}

                          <div className="score-display">
                            <span className="score-number">
                              {getContributionCount(entry, filterPeriod)}
                            </span>
                            <span className="score-label">
                              {filterPeriod === "weekly"
                                ? "this week"
                                : filterPeriod === "monthly"
                                ? "this month"
                                : "total"}
                            </span>
                          </div>

                          <div className="user-stats">
                            <div className="stat">
                              <span className="stat-value">
                                {entry.contributions}
                              </span>
                              <span className="stat-text">Total PRs</span>
                            </div>
                            <div className="stat">
                              <span className="stat-value">
                                {entry.repositories}
                              </span>
                              <span className="stat-text">Repos</span>
                            </div>
                          </div>

                          {entry.achievements.length > 0 && (
                            <div className="achievements">
                              {entry.achievements.map((achievement, i) => (
                                <span key={i} className="achievement-tag">
                                  {achievement}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="leaderboard-actions">
                          <a
                            href={entry.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="github-link"
                          >
                            <span className="github-icon">GitHub</span>
                            View Profile
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {!isLoadingLeaderboard &&
                !leaderboardError &&
                filteredLeaderboardData.length === 0 && (
                  <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h3>No data available</h3>
                    <p>No contributors found. Check back later!</p>
                  </motion.div>
                )}
            </div>
          ) : null}
        </main>
      </div>
    );
};

const Dashboard: React.FC = () => {
  return (
    <Layout
      title="Dashboard"
      description="RecodeHive Community Dashboard"
      noFooter
    >
      <Head>
        <title>RecodeHive | Dashboard</title>
        <meta name="description" content="RecodeHive Community Dashboard" />
      </Head>
      <BrowserOnly fallback={<div>Loading...</div>}>
        {() => (
          <CommunityStatsProvider>
            <DashboardContent />
          </CommunityStatsProvider>
        )}
      </BrowserOnly>
    </Layout>
  );
};

export default Dashboard;
