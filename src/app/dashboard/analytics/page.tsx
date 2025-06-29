'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import styles from './Analytics.module.scss';

interface AnalyticsData {
  submissions: {
    monthly: Array<{ month: string; count: number; }>;
    byCategory: Array<{ category: string; count: number; }>;
    byStatus: Array<{ status: string; count: number; }>;
  };
  reviews: {
    turnaroundTime: Array<{ month: string; avgDays: number; }>;
    acceptanceRate: Array<{ month: string; rate: number; }>;
  };
  publications: {
    monthly: Array<{ month: string; count: number; }>;
    topCited: Array<{ title: string; citations: number; id: string; }>;
  };
  engagement: {
    views: Array<{ month: string; count: number; }>;
    downloads: Array<{ month: string; count: number; }>;
  };
  performance: {
    averageReviewTime: number;
    acceptanceRate: number;
    totalSubmissions: number;
    totalPublished: number;
    activeReviewers: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12m'); // 3m, 6m, 12m, all

  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has analytics permissions (admin or editor)
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      router.push('/dashboard');
      return;
    }

    fetchAnalyticsData();
  }, [session, router, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to export report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `journal-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Failed to load analytics</h2>
          <button onClick={fetchAnalyticsData} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Journal Analytics</h1>
        <div className={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={styles.timeRangeSelect}
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={exportReport} className={styles.exportBtn}>
            Export Report
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <h3>Total Submissions</h3>
          <div className={styles.kpiValue}>{analyticsData.performance.totalSubmissions}</div>
        </div>
        <div className={styles.kpiCard}>
          <h3>Published Articles</h3>
          <div className={styles.kpiValue}>{analyticsData.performance.totalPublished}</div>
        </div>
        <div className={styles.kpiCard}>
          <h3>Acceptance Rate</h3>
          <div className={styles.kpiValue}>{analyticsData.performance.acceptanceRate.toFixed(1)}%</div>
        </div>
        <div className={styles.kpiCard}>
          <h3>Avg Review Time</h3>
          <div className={styles.kpiValue}>{analyticsData.performance.averageReviewTime} days</div>
        </div>
        <div className={styles.kpiCard}>
          <h3>Active Reviewers</h3>
          <div className={styles.kpiValue}>{analyticsData.performance.activeReviewers}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Submissions Over Time */}
        <div className={styles.chartCard}>
          <h3>Submissions Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.submissions.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Submissions by Category */}
        <div className={styles.chartCard}>
          <h3>Submissions by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.submissions.byCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className={styles.chartCard}>
          <h3>Manuscript Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.submissions.byStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analyticsData.submissions.byStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Review Turnaround Time */}
        <div className={styles.chartCard}>
          <h3>Average Review Turnaround Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.reviews.turnaroundTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgDays" stroke="#00C49F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Publications Over Time */}
        <div className={styles.chartCard}>
          <h3>Publications Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.publications.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#FF8042" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Metrics */}
        <div className={styles.chartCard}>
          <h3>User Engagement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.engagement.views}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} name="Views" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Cited Articles */}
      <div className={styles.topCitedSection}>
        <h3>Most Cited Articles</h3>
        <div className={styles.citedList}>
          {analyticsData.publications.topCited.map((article, index) => (
            <div key={article.id} className={styles.citedItem}>
              <span className={styles.rank}>#{index + 1}</span>
              <div className={styles.articleInfo}>
                <h4>{article.title}</h4>
                <span className={styles.citations}>{article.citations} citations</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
