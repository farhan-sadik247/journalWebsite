import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { StatsSection } from '@/components/home/StatsSection';
import { RecentArticles } from '@/components/home/RecentArticles';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <RecentArticles />
    </>
  );
}
