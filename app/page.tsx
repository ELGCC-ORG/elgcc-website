import Hero from "@/components/home/Hero";
import LiveBanner from "@/components/home/LiveBanner";
import Programmes from "@/components/home/Programmes";
import About from "@/components/home/About";
import RadioBroadcast from "@/components/home/RadioBroadcast";
import Devotional from "@/components/home/Devotional";
import Locations from "@/components/home/Locations";
import SocialMedia from "@/components/home/SocialMedia";

export default function Home() {
    return (
        <>
            <Hero />
            <LiveBanner />
            <Programmes />
            <About />
            <RadioBroadcast />
            <Devotional />
            <Locations />
            <SocialMedia />
        </>
    );
}
