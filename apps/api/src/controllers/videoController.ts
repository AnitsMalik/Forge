import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import crypto from 'crypto';
import type {
  MotionCaptionStyle,
  ReelScene,
  ReelStoryboardResponse,
} from '@socialforge/shared';
import { VideoEngine } from '../services/videoEngine.js';
import { BrandBrainService } from '../services/brandBrainService.js';
import { TtsService } from '../services/ttsService.js';

export const BROLL_VIDEOS = [
  {
    id: 'ocean_waves',
    name: 'Ambient Shore Waves',
    category: 'nature',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-waves-coming-to-the-beach-41132-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'botanical_breeze',
    name: 'Botanical Sunlight Breeze',
    category: 'luxury',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ink_swirl',
    name: 'Liquid Ink Swirl',
    category: 'abstract',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-43384-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'neon_city',
    name: 'Cyberpunk Neon Matrix',
    category: 'tech',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-top-aerial-shot-of-seashore-with-rocks-1090-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
  },
];

export const AUDIO_TRACKS = [
  { id: 'lofi_groove', name: 'Lofi Chill Morning', genre: 'Lofi / Calm', duration: '0:15', bpm: 82 },
  { id: 'synth_drive', name: 'Cyberpunk Synth Drive', genre: 'Electronic / Tech', duration: '0:15', bpm: 124 },
  { id: 'acoustic_bloom', name: 'Acoustic Botanical Bloom', genre: 'Acoustic / Warm', duration: '0:15', bpm: 95 },
  { id: 'future_bass', name: 'Dynamic High-Energy Drop', genre: 'Punchy / Viral', duration: '0:15', bpm: 130 },
];

export class VideoController {
  // List video templates (covering all 9 Directive 11 categories) and resources
  public static async listTemplates(req: Request, res: Response): Promise<void> {
    const templates = [
      {
        id: 'tpl-video-promo',
        category: 'promotion',
        name: 'VIP Perks & Promotional Drop',
        description: 'High-energy 4-scene video spotlighting limited perks, countdown badge, and instant CTA.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.5,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '✦ VIP EXCLUSIVE', headline: 'Unlock Early Access Perks', subtext: 'Stop scrolling and claim member privileges.', animation: 'kinetic_pop' },
          { order: 2, durationSec: 2.5, badge: '💎 PREMIUM BENEFIT', headline: 'Priority Dispatch & Concierge', subtext: 'Designed for high performers.', animation: 'scale' },
          { order: 3, durationSec: 2.0, badge: '⚡ 48-HOUR WINDOW', headline: '30% Off With Code VIP30', subtext: 'Limited drop allocation.', animation: 'kinetic_pop' },
          { order: 4, durationSec: 2.0, badge: '👉 CLAIM NOW', headline: 'Tap Link in Bio', subtext: 'Instant redemption today.', animation: 'slide' },
        ],
      },
      {
        id: 'tpl-video-edu',
        category: 'educational',
        name: 'Step-by-Step Framework Masterclass',
        description: 'Structured vertical masterclass breaking down complex ideas into 4 actionable steps.',
        aspectRatio: '9:16',
        defaultDurationSec: 9.0,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '📚 MASTERCLASS', headline: 'The 3-Step Growth Protocol', subtext: 'How elite brands scale content effortlessly.', animation: 'typewriter' },
          { order: 2, durationSec: 2.5, badge: '01 / BLUEPRINT', headline: 'Systemize Brand Voice & Assets', subtext: 'Turn 1 idea into multi-channel campaigns.', animation: 'slide' },
          { order: 3, durationSec: 2.5, badge: '02 / MOMENTUM', headline: 'Batch Schedule & Automate', subtext: 'Consistent posting without burnout.', animation: 'kinetic_pop' },
          { order: 4, durationSec: 2.0, badge: '03 / TAKE ACTION', headline: 'Download The Free Playbook', subtext: 'Link in bio for full PDF guide.', animation: 'scale' },
        ],
      },
      {
        id: 'tpl-video-product',
        category: 'product',
        name: 'Flagship Product Showcase',
        description: 'Dynamic product reel highlighting core features, specs, and glowing value badges.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.0,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '✨ FLAGSHIP DROP', headline: 'Engineered For Peak Performance', subtext: 'The all-new formulation is finally here.', animation: 'kinetic_pop' },
          { order: 2, durationSec: 2.0, badge: '🔬 100% CLINICAL', headline: '15% Active L-Ascorbic Acid', subtext: 'Dermatologist tested and verified.', animation: 'scale' },
          { order: 3, durationSec: 2.0, badge: '📈 +340% GLOW', headline: 'Visible Radiance In 14 Days', subtext: 'Backed by independent clinical trials.', animation: 'cinematic_fade' },
          { order: 4, durationSec: 2.0, badge: '🛍️ SHOP NOW', headline: 'Order Yours Today', subtext: 'Free shipping on orders over $50.', animation: 'slide' },
        ],
      },
      {
        id: 'tpl-video-announcement',
        category: 'announcement',
        name: 'Breaking News & Feature Release',
        description: 'High-contrast electric announcement reel with tag badge and launch date.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.0,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '🚀 MAJOR UPDATE', headline: 'Something Big Just Dropped', subtext: 'The feature you requested is live.', animation: 'kinetic_pop' },
          { order: 2, durationSec: 2.5, badge: '⚡ INTRODUCING V2', headline: 'AI Campaign Arc Studio', subtext: '1-click strategy and multi-post synthesis.', animation: 'typewriter' },
          { order: 3, durationSec: 1.5, badge: '✦ AVAILABLE NOW', headline: 'Live Across All Accounts', subtext: 'No waitlist required.', animation: 'scale' },
          { order: 4, durationSec: 2.0, badge: '👉 TRY IT TODAY', headline: 'Experience SocialForge V2', subtext: 'Tap link in bio to start.', animation: 'slide' },
        ],
      },
      {
        id: 'tpl-video-testimonial',
        category: 'testimonial',
        name: 'Customer Proof & 5-Star Review',
        description: 'Social validation reel with glowing quote, star rating, and customer authority.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.5,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '★★★★★ 5.0 RATING', headline: 'Real Results From Real Users', subtext: 'See what our community has to say.', animation: 'cinematic_fade' },
          { order: 2, durationSec: 2.5, badge: '💬 VERIFIED REVIEW', headline: '“Cut Our Production Time By 80%”', subtext: '— Elena Rostova, VP of Growth', animation: 'typewriter' },
          { order: 3, durationSec: 2.0, badge: '📈 10X OUTPUT', headline: 'From 2 Posts To 20 Posts Weekly', subtext: 'With zero compromise on quality.', animation: 'scale' },
          { order: 4, durationSec: 2.0, badge: '⚡ JOIN TODAY', headline: 'Start Your 14-Day Free Trial', subtext: 'Link in bio for instant setup.', animation: 'slide' },
        ],
      },
      {
        id: 'tpl-video-quote',
        category: 'quote',
        name: 'Modern Editorial Quote Reel',
        description: 'Serene ambient video with flowing typographic motion for thought leadership.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.0,
        defaultScenes: [
          { order: 1, durationSec: 2.5, badge: '💡 THOUGHT LEADERSHIP', headline: '“The Best Marketing Doesn’t Feel Like Marketing.”', subtext: '— Tom Fishburne', animation: 'cinematic_fade' },
          { order: 2, durationSec: 2.5, badge: '✦ PERSPECTIVE', headline: 'Focus on Value, Authenticity & Clarity', subtext: 'Audience loyalty follows genuine connection.', animation: 'typewriter' },
          { order: 3, durationSec: 3.0, badge: '👉 JOIN THE CONVERSATION', headline: 'What’s Your Take? Comment Below', subtext: 'Save and share with your team.', animation: 'slide' },
        ],
      },
      {
        id: 'tpl-video-event',
        category: 'event',
        name: 'Live Masterclass & Webinar RSVP',
        description: 'Event invitation with speaker badges, calendar date, and RSVP call to action.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.5,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '🔴 LIVE WEBINAR', headline: 'Mastering AI Social Media Workflows', subtext: 'Join industry experts this Thursday.', animation: 'kinetic_pop' },
          { order: 2, durationSec: 2.5, badge: '📅 THURSDAY 2PM EST', headline: 'Exclusive Live Demonstration', subtext: 'Real-time teardowns and Q&A session.', animation: 'slide' },
          { order: 3, durationSec: 2.0, badge: '🎟️ FREE PASS', headline: 'Limited To 500 Attendees', subtext: 'Claim your seat before it fills up.', animation: 'scale' },
          { order: 4, durationSec: 2.0, badge: '👉 RSVP NOW', headline: 'Tap Link In Bio To Register', subtext: 'Instant calendar invite included.', animation: 'slide' },
        ],
      },
      {
        id: 'tpl-video-carousel',
        category: 'carousel',
        name: 'Swipe Hook & Narrative Arc',
        description: 'Fast-paced viral hook building curiosity and momentum.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.0,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '👉 DON’T MISS THIS', headline: '5 Signs Your Strategy Needs An Update', subtext: 'Swipe through to diagnose your bottlenecks.', animation: 'kinetic_pop' },
          { order: 2, durationSec: 2.0, badge: 'NUMBER 1', headline: 'Spending 3+ Hours Per Post', subtext: 'Manual creation doesn’t scale.', animation: 'scale' },
          { order: 3, durationSec: 2.0, badge: 'NUMBER 2', headline: 'Inconsistent Brand Voice', subtext: 'Confusing your audience across channels.', animation: 'slide' },
          { order: 4, durationSec: 2.0, badge: '💡 THE SOLUTION', headline: 'Automate With Brand Governance', subtext: 'Tap link in bio to read full breakdown.', animation: 'kinetic_pop' },
        ],
      },
      {
        id: 'tpl-video-sale',
        category: 'sale',
        name: 'Flash Sale & Limited Drop',
        description: 'Urgency-driven promotional sequence with promo code and countdown styling.',
        aspectRatio: '9:16',
        defaultDurationSec: 8.0,
        defaultScenes: [
          { order: 1, durationSec: 2.0, badge: '🔥 FLASH SALE', headline: 'Our Biggest Drop Of The Season', subtext: 'Prices slashed for 48 hours only.', animation: 'kinetic_pop' },
          { order: 2, durationSec: 2.0, badge: '⚡ 40% OFF', headline: 'Site-Wide Savings Active Now', subtext: 'No minimum order required.', animation: 'scale' },
          { order: 3, durationSec: 2.0, badge: '🏷️ CODE: FLASH40', headline: 'Enter Code At Checkout', subtext: 'While inventory lasts.', animation: 'typewriter' },
          { order: 4, durationSec: 2.0, badge: '🛒 SHOP DROP', headline: 'Tap Link In Bio Before It Sells Out', subtext: 'Sale ends midnight Sunday.', animation: 'slide' },
        ],
      },
    ];

    res.json({
      success: true,
      data: {
        templates,
        brollVideos: BROLL_VIDEOS,
        audioTracks: AUDIO_TRACKS,
      },
    });
  }

  // 1. AI Storyboard Generator with dynamic duration scaling (15s, 30s, 60s, custom)
  public static async generateStoryboard(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const {
        text,
        customTopic,
        campaignId,
        targetDurationSec = 30,
        aspectRatio = '9:16',
        visualStyle = 'corporate',
        language = 'en',
        voiceoverPersona = 'david',
      } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Text is required for storyboard generation' } });
        return;
      }

      const cleanText = text
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/#\w+/g, '')
        .replace(/[*_~`]/g, '')
        .trim();

      // Topic detection
      let topic = customTopic;
      if (!topic) {
        if (/skin|beauty|glow|serum|cosmetic|dermatolog/i.test(text)) topic = 'beauty';
        else if (/ai|tech|software|saas|cloud|data|platform/i.test(text)) topic = 'tech';
        else if (/revenue|market|scale|b2b|growth|funding/i.test(text)) topic = 'business';
        else topic = 'lifestyle';
      }

      // Extract lines/sentences
      const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const hookHeadline = lines[0] || 'Experience The Next Level';

      // Metric search
      const metricMatch = text.match(/(?:\+|\-)?\d+(?:\.\d+)?(?:%|x|k|m)/i);
      const metricText = metricMatch ? metricMatch[0] : '+340%';

      // Centralized Brand Brain context injection
      let brandBrain: any = null;
      try {
        brandBrain = await BrandBrainService.getBrandBrain(brandId);
      } catch (err) {}

      // Campaign context injection if campaignId provided
      let campaignInfo: any = null;
      if (campaignId) {
        try {
          campaignInfo = await db('campaigns').where('id', campaignId).first();
        } catch {}
      }

      // CTA detection incorporating Brand Brain & Promo Code
      let ctaHeadline = brandBrain?.ctaPreferences?.[0] || 'Tap Link In Bio To Shop Now';
      let ctaSubtext = 'Available today with exclusive launch perks.';
      if (/code\s*(\w+)/i.test(text)) {
        const codeMatch = text.match(/code\s*([A-Za-z0-9]+)/i);
        ctaHeadline = `Use Code ${codeMatch ? codeMatch[1].toUpperCase() : 'GLOW20'} For 20% Off`;
        ctaSubtext = 'Limited launch allocation. Tap link in bio!';
      }

      const dur = Number(targetDurationSec) || 30;
      let scenes: ReelScene[] = [];

      if (dur <= 18) {
        // 15-SECOND FORMAT: 4 fast-paced beats totaling 15.0s
        scenes = [
          {
            id: 'scene-1',
            order: 1,
            durationSec: 3.5,
            badge: topic === 'beauty' ? '✨ STOP SCROLLING' : '✦ WAIT FOR IT',
            headline: hookHeadline.slice(0, 50),
            subtext: 'Discover what high-velocity creation looks like.',
            narrationScript: `Stop scrolling. ${hookHeadline.slice(0, 50)}.`,
            accentIcon: 'Sparkles',
            animation: 'kinetic_pop',
            transition: 'cut',
          },
          {
            id: 'scene-2',
            order: 2,
            durationSec: 4.0,
            badge: '💡 THE SOLUTION',
            headline: lines.length > 1 ? lines[1].slice(0, 55) : 'Engineered for immediate visible results',
            subtext: 'Formulated with clinically validated efficacy.',
            narrationScript: lines.length > 1 ? lines[1] : 'Engineered for immediate visible results with clinical precision.',
            accentIcon: 'Layers',
            animation: 'scale',
            transition: 'fade',
          },
          {
            id: 'scene-3',
            order: 3,
            durationSec: 3.5,
            badge: `📈 ${metricText} PROVEN IMPACT`,
            headline: lines.length > 2 ? lines[2].slice(0, 55) : `Delivering measurable ${metricText} improvements`,
            subtext: 'Verified by independent industry testing.',
            narrationScript: `Delivering measurable ${metricText} improvements across every benchmark.`,
            accentIcon: 'TrendingUp',
            animation: 'cinematic_fade',
            transition: 'zoom',
          },
          {
            id: 'scene-4',
            order: 4,
            durationSec: 4.0,
            badge: '⚡ CLAIM ACCESS',
            headline: ctaHeadline.slice(0, 55),
            subtext: ctaSubtext,
            narrationScript: `${ctaHeadline}. ${ctaSubtext}`,
            accentIcon: 'ArrowRight',
            animation: 'slide',
            transition: 'slide',
          },
        ];
      } else if (dur >= 45) {
        // 60-SECOND FORMAT: 8 in-depth narrative beats totaling 60.0s
        scenes = [
          {
            id: 'scene-1',
            order: 1,
            durationSec: 7.0,
            badge: '⚡ URGENT INSIGHT',
            headline: hookHeadline.slice(0, 55),
            subtext: 'Most teams struggle with content velocity and consistency.',
            narrationScript: `Attention creators and leaders. ${hookHeadline}. Most teams struggle with content velocity and consistency.`,
            accentIcon: 'Sparkles',
            animation: 'kinetic_pop',
            transition: 'cut',
          },
          {
            id: 'scene-2',
            order: 2,
            durationSec: 7.5,
            badge: '⚠️ THE HIDDEN BOTTLENECK',
            headline: 'Manual Production Takes 10x Longer',
            subtext: 'Spending hours on video cuts and subtitles drains momentum.',
            narrationScript: 'Manual video editing and endless retakes drain momentum and stall your organic growth.',
            accentIcon: 'AlertCircle',
            animation: 'typewriter',
            transition: 'fade',
          },
          {
            id: 'scene-3',
            order: 3,
            durationSec: 7.5,
            badge: '💡 THE NEW PARADIGM',
            headline: lines.length > 1 ? lines[1].slice(0, 55) : 'Systemize Creation with AI Automation',
            subtext: 'Turn 1 prompt into ready-to-publish native video reels.',
            narrationScript: lines.length > 1 ? lines[1] : 'Here is the breakthrough: systemize video production with automated AI pipelines.',
            accentIcon: 'Layers',
            animation: 'scale',
            transition: 'wipe',
          },
          {
            id: 'scene-4',
            order: 4,
            durationSec: 8.0,
            badge: '🎯 NARRATIVE ARCHITECTURE',
            headline: 'Hook, Value, Proof & Dynamic Motion',
            subtext: 'Each beat is mathematically timed for maximum retention.',
            narrationScript: 'Every second is engineered for high retention, combining kinetic subtitles and synchronized audio.',
            accentIcon: 'Sliders',
            animation: 'karaoke_highlight',
            transition: 'zoom',
          },
          {
            id: 'scene-5',
            order: 5,
            durationSec: 7.5,
            badge: `📈 ${metricText} VERIFIED METRICS`,
            headline: 'Measurable Growth Across All Channels',
            subtext: 'Brands see engagement spike while production hours drop 80%.',
            narrationScript: `In real world testing, teams achieve ${metricText} higher reach with eighty percent less effort.`,
            accentIcon: 'TrendingUp',
            animation: 'cinematic_fade',
            transition: 'fade',
          },
          {
            id: 'scene-6',
            order: 6,
            durationSec: 7.5,
            badge: '💎 MULTI-ASPECT CAPABILITY',
            headline: '9:16 Reels, 16:9 Landscape & 1:1 Feed',
            subtext: 'Seamlessly render any format in crisp 1080p and 4K.',
            narrationScript: 'Publish vertical reels for TikTok, widescreen for YouTube, and square for feed with zero friction.',
            accentIcon: 'Film',
            animation: 'slide',
            transition: 'slide',
          },
          {
            id: 'scene-7',
            order: 7,
            durationSec: 7.5,
            badge: '🛡️ ENTERPRISE GOVERNANCE',
            headline: 'Brand Kit, Font Sync & Asset Security',
            subtext: 'Your colors, logos, and custom voiceover baked in natively.',
            narrationScript: 'Built-in brand brain safeguards your visual identity and tone across every single campaign.',
            accentIcon: 'CheckCircle2',
            animation: 'scale',
            transition: 'zoom',
          },
          {
            id: 'scene-8',
            order: 8,
            durationSec: 7.5,
            badge: '👉 JOIN THE LEADERS',
            headline: ctaHeadline.slice(0, 55),
            subtext: ctaSubtext,
            narrationScript: `${ctaHeadline}. ${ctaSubtext}. Tap link in bio to start right now.`,
            accentIcon: 'ArrowRight',
            animation: 'kinetic_pop',
            transition: 'slide',
          },
        ];
      } else {
        // 30-SECOND PRIMARY WORKFLOW: 5 structured narrative beats totaling 30.0s
        scenes = [
          {
            id: 'scene-1',
            order: 1,
            durationSec: 5.0,
            badge: topic === 'beauty' ? '✨ STOP SCROLLING' : '✦ SCROLL STOPPER',
            headline: hookHeadline.slice(0, 50),
            subtext: 'Transform the way you create video content.',
            narrationScript: `Stop scrolling. ${hookHeadline.slice(0, 50)}.`,
            accentIcon: 'Sparkles',
            animation: 'kinetic_pop',
            transition: 'cut',
          },
          {
            id: 'scene-2',
            order: 2,
            durationSec: 6.0,
            badge: '⚠️ THE PROBLEM',
            headline: lines.length > 1 ? lines[1].slice(0, 55) : 'Creating High-Converting Video Is Too Slow',
            subtext: 'Most creators spend hours manually editing single clips.',
            narrationScript: lines.length > 1 ? lines[1] : 'Creating high-converting video takes too much manual time and effort.',
            accentIcon: 'AlertCircle',
            animation: 'typewriter',
            transition: 'fade',
          },
          {
            id: 'scene-3',
            order: 3,
            durationSec: 7.0,
            badge: '💡 THE BREAKTHROUGH',
            headline: lines.length > 2 ? lines[2].slice(0, 55) : 'AI-Powered Text-To-Video Generation',
            subtext: 'From natural-language prompt to complete rendered video in seconds.',
            narrationScript: lines.length > 2 ? lines[2] : 'Introducing AI-powered text to video. Turn simple ideas into fully rendered masterpieces.',
            accentIcon: 'Layers',
            animation: 'scale',
            transition: 'zoom',
          },
          {
            id: 'scene-4',
            order: 4,
            durationSec: 6.0,
            badge: `📈 ${metricText} PROVEN IMPACT`,
            headline: 'Noticeable Results & Engagement Spike',
            subtext: 'Verified by independent trials and creator benchmarks.',
            narrationScript: `Proven to deliver ${metricText} higher engagement and cut production time by eighty percent.`,
            accentIcon: 'TrendingUp',
            animation: 'cinematic_fade',
            transition: 'wipe',
          },
          {
            id: 'scene-5',
            order: 5,
            durationSec: 6.0,
            badge: '⚡ TAKE ACTION NOW',
            headline: ctaHeadline.slice(0, 55),
            subtext: ctaSubtext,
            narrationScript: `${ctaHeadline}. ${ctaSubtext}`,
            accentIcon: 'ArrowRight',
            animation: 'slide',
            transition: 'slide',
          },
        ];
      }

      const totalDurationSec = scenes.reduce((sum, s) => sum + s.durationSec, 0);

      let suggestedBg = BROLL_VIDEOS[0].url;
      let suggestedAudio = AUDIO_TRACKS[0].id;
      let motionStyle: MotionCaptionStyle = 'kinetic_pop';

      if (topic === 'beauty') {
        suggestedBg = BROLL_VIDEOS[1].url;
        suggestedAudio = 'acoustic_bloom';
        motionStyle = 'cinematic_fade';
      } else if (topic === 'tech') {
        suggestedBg = BROLL_VIDEOS[3].url;
        suggestedAudio = 'synth_drive';
        motionStyle = 'kinetic_pop';
      } else if (topic === 'business') {
        suggestedBg = BROLL_VIDEOS[2].url;
        suggestedAudio = 'future_bass';
        motionStyle = 'typewriter';
      }

      const responseData: ReelStoryboardResponse = {
        title: `${hookHeadline.slice(0, 30)} (${aspectRatio} Video)`,
        topic,
        aspectRatio,
        visualStyle,
        language,
        voiceoverPersona,
        suggestedMotionStyle: motionStyle,
        suggestedBgVideoUrl: suggestedBg,
        suggestedAudioTrackId: suggestedAudio,
        totalDurationSec,
        scenes,
      };

      res.json({
        success: true,
        data: responseData,
      });
    } catch (err: any) {
      console.error('[VideoController.generateStoryboard] Error:', err);
      // Never crash or discard user draft
      res.status(500).json({ success: false, error: { code: 'STORYBOARD_ERROR', message: err.message } });
    }
  }

  // 2. Get async render job status (queries DB and memory)
  public static async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await VideoEngine.getJob(jobId);
      if (!job) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        return;
      }
      res.json({ success: true, data: job });
    } catch (err: any) {
      console.error('[VideoController.getJobStatus] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  // 3. List recent render jobs for brand
  public static async listJobs(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const jobs = await VideoEngine.listJobs(brandId);
      res.json({ success: true, data: jobs });
    } catch (err: any) {
      console.error('[VideoController.listJobs] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  // 4. Retry a failed render job idempotently
  public static async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, jobId } = req.params;
      const job = await VideoEngine.getJob(jobId);
      if (!job) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found to retry' } });
        return;
      }

      const brand = await db('brands').where('id', brandId).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      // Re-trigger render in background
      const payload = job.requestPayload || {
        brandId,
        title: 'Retried Reel',
        durationSec: 8,
      };

      VideoEngine.renderReel(payload, { id: brand.id, name: brand.name }, jobId).catch((err) => {
        console.error('[VideoController.retryJob] Background retry error:', err);
      });

      res.json({
        success: true,
        message: 'Render job retry initiated.',
        data: { jobId, status: 'processing' },
      });
    } catch (err: any) {
      console.error('[VideoController.retryJob] Error:', err);
      res.status(500).json({ success: false, error: { code: 'RETRY_ERROR', message: err.message } });
    }
  }

  // 5. Render and persist video reel to Media Library using native FFmpeg pipeline (supports 9:16, 16:9, 1:1)
  public static async renderVideo(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const {
        templateId = 'product_spotlight_reel',
        title = 'Brand Spotlight Reel',
        subtext = 'Short-form video',
        durationSec,
        scenes = [],
        motionStyle = 'kinetic_pop',
        bgVideoUrl,
        audioTrackId = 'lofi_groove',
        burnSubtitles = true,
        includeOutro = true,
        outroHeadline,
        outroSubtext,
        voiceoverUrl,
        voiceoverPersona,
        generateVoiceoverTts,
        aspectRatio = '9:16',
        qualityPreset = '1080p',
        visualStyle = 'corporate',
        language = 'en',
        musicVolume,
        voiceoverVolume,
        duckingIntensity,
        captionStyleConfig,
        campaignId,
      } = req.body;

      const brand = await db('brands').where('id', brandId).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      // Centralized Brand Brain inheritance
      let primaryColor = '#38BDF8';
      let logoUrl: string | undefined;

      try {
        const brandBrain = await BrandBrainService.getBrandBrain(brandId);
        if (brandBrain.visualIdentity?.colors?.primary) {
          primaryColor = brandBrain.visualIdentity.colors.primary;
        }
        if (brandBrain.visualIdentity?.logoUrls?.primary) {
          logoUrl = brandBrain.visualIdentity.logoUrls.primary;
        }
      } catch (err) {
        const brandKit = await db('brand_kits').where('brand_id', brandId).first();
        if (brandKit) {
          const colors = typeof brandKit.primary_colors === 'string' ? JSON.parse(brandKit.primary_colors) : brandKit.primary_colors;
          if (Array.isArray(colors) && colors.length > 0) primaryColor = colors[0];
          const logos = typeof brandKit.logo_urls === 'string' ? JSON.parse(brandKit.logo_urls) : brandKit.logo_urls;
          if (Array.isArray(logos) && logos.length > 0) logoUrl = logos[0];
        }
      }

      // Execute native FFmpeg multi-aspect composition engine
      const renderResult = await VideoEngine.renderReel(
        {
          brandId,
          templateId,
          title,
          subtext,
          durationSec,
          scenes,
          motionStyle,
          bgVideoUrl,
          audioTrackId,
          burnSubtitles,
          includeOutro,
          outroHeadline: outroHeadline || brand.name,
          outroSubtext: outroSubtext || 'Tap link in bio to explore more.',
          voiceoverUrl,
          voiceoverPersona,
          generateVoiceoverTts,
          aspectRatio,
          qualityPreset,
          visualStyle,
          language,
          musicVolume,
          voiceoverVolume,
          duckingIntensity,
          campaignId,
          captionStyleConfig: {
            ...captionStyleConfig,
            primaryColorHex: primaryColor,
          },
        },
        {
          id: brand.id,
          name: brand.name,
          primaryColor,
          logoUrl,
        }
      );

      // Persist rendered video asset to MySQL media_assets
      await db('media_assets').insert({
        id: renderResult.assetId,
        tenant_id: brand.tenant_id,
        brand_id: brand.id,
        storage_key: `videos/${renderResult.fileName}`,
        public_url: renderResult.publicUrl,
        thumbnail_url: renderResult.thumbnailUrl,
        file_name: renderResult.fileName,
        mime_type: 'video/mp4',
        file_size_bytes: renderResult.fileSizeBytes,
        media_type: 'video',
        metadata: JSON.stringify({
          width: renderResult.width,
          height: renderResult.height,
          aspectRatio,
          qualityPreset,
          visualStyle,
          language,
          voiceoverPersona: voiceoverPersona || null,
          durationSec: renderResult.durationSec,
          templateId,
          title,
          subtext,
          motionStyle,
          audioTrackId,
          scenesCount: scenes.length,
          scenes,
          campaignId: campaignId || null,
          codec: renderResult.codec,
          engineUsed: renderResult.engineUsed,
          filtersApplied: renderResult.filtersApplied,
          pipeline: `SocialForge FFmpeg ${aspectRatio} Video Motion Studio`,
        }),
        created_at: new Date(),
      });

      // Link completed job to media asset
      try {
        await db('video_render_jobs').where('id', renderResult.jobId).update({
          result_asset_id: renderResult.assetId,
          updated_at: new Date(),
        });
      } catch (jobErr) {
        console.warn('[VideoController] Could not link result_asset_id to job:', jobErr);
      }

      const savedAsset = await db('media_assets').where('id', renderResult.assetId).first();
      if (savedAsset && typeof savedAsset.metadata === 'string') {
        savedAsset.metadata = JSON.parse(savedAsset.metadata);
      }

      res.status(201).json({
        success: true,
        data: {
          asset: savedAsset,
          renderResult,
          message: `${aspectRatio} Video Reel successfully composed with FFmpeg and saved to Media Library.`,
        },
      });
    } catch (err: any) {
      console.error('[VideoController.renderVideo] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'VIDEO_RENDER_ERROR', message: err.message || 'Failed to render video reel' },
      });
    }
  }

  // 6. AI Scene Regeneration for single beat
  public static async regenerateScene(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { sceneIndex = 0, currentScene, prompt = '', topic = 'business', visualStyle = 'corporate' } = req.body;

      const beatRoles = [
        'Hook & Attention',
        'Problem & Agitation',
        'Solution & Value Proposition',
        'Proof & Metrics Validation',
        'Urgent Call to Action',
      ];
      const beatName = beatRoles[sceneIndex] || `Scene Beat ${sceneIndex + 1}`;

      // Context-aware alternative variations
      const variations: Record<string, Array<{ headline: string; subtext: string; badge: string; anim: MotionCaptionStyle }>> = {
        beauty: [
          { badge: '✨ GLOW ELEVATION', headline: 'Visible Radiance In Just 7 Days', subtext: 'Clinically proven bio-active formulation.', anim: 'kinetic_pop' },
          { badge: '🌿 PURE BOTANICALS', headline: 'Zero Toxins, 100% Active Efficacy', subtext: 'Clean dermatologist-approved daily barrier protection.', anim: 'cinematic_fade' },
          { badge: '💎 CLINICAL PROOF', headline: '94% Reported Smoother Texture', subtext: 'Independent blind study over 4 continuous weeks.', anim: 'scale' },
          { badge: '🛍️ LIMITED SUPPLY', headline: 'Claim Launch Batch With Code GLOW20', subtext: 'Free shipping on orders over $50 today only.', anim: 'slide' },
        ],
        tech: [
          { badge: '⚡ 10X VELOCITY', headline: 'Automate Complex Workflows In 1 Click', subtext: 'Eliminate repetitive manual busywork forever.', anim: 'kinetic_pop' },
          { badge: '🧠 NEURAL PRECISION', headline: 'Enterprise AI Grounded In Your Data', subtext: 'Deterministic speed with zero hallucination risk.', anim: 'typewriter' },
          { badge: '📈 +420% ROI', headline: 'Proven To Cut Production Hours By 80%', subtext: 'Over 12,000 teams actively scale their output.', anim: 'scale' },
          { badge: '👉 TRY IT TODAY', headline: 'Start Your Free 14-Day Workspace', subtext: 'No credit card required. Instant onboarding.', anim: 'slide' },
        ],
        business: [
          { badge: '🚀 SCALE REVENUE', headline: 'Systemize Your Client Acquisition Engine', subtext: 'Predictable growth without bloated overhead costs.', anim: 'kinetic_pop' },
          { badge: '💡 KEY PLAYBOOK', headline: 'Turn 1 Idea Into 30 Multi-Channel Posts', subtext: 'Maximize distribution while working fewer hours.', anim: 'scale' },
          { badge: '📊 VERIFIED IMPACT', headline: 'Clients See 3.4x Higher In-Feed Reach', subtext: 'Continuous benchmark testing across all tiers.', anim: 'cinematic_fade' },
          { badge: '⚡ SECURE YOUR SPOT', headline: 'Schedule Your Growth Audit Today', subtext: 'Limited advisory sessions available this quarter.', anim: 'slide' },
        ],
      };

      const pool = variations[topic] || variations.business;
      const pick = pool[sceneIndex % pool.length] || pool[0];

      const regeneratedScene: ReelScene = {
        id: currentScene?.id || `scene-${Date.now()}`,
        order: (sceneIndex || 0) + 1,
        durationSec: currentScene?.durationSec || 5.0,
        badge: pick.badge,
        headline: pick.headline,
        subtext: pick.subtext,
        narrationScript: `${pick.headline}. ${pick.subtext}`,
        accentIcon: sceneIndex === 0 ? 'Sparkles' : sceneIndex === 4 ? 'ArrowRight' : 'Layers',
        animation: pick.anim,
        transition: currentScene?.transition || 'fade',
      };

      res.json({
        success: true,
        data: {
          scene: regeneratedScene,
          message: `Scene ${sceneIndex + 1} (${beatName}) regenerated with AI.`,
        },
      });
    } catch (err: any) {
      console.error('[VideoController.regenerateScene] Error:', err);
      res.status(500).json({ success: false, error: { code: 'REGENERATE_ERROR', message: err.message } });
    }
  }

  // 7. TTS Speech Synthesizer endpoint
  public static async synthesizeSpeech(req: Request, res: Response): Promise<void> {
    try {
      const { text, voicePersona = 'david', language = 'en', speechRate = 0 } = req.body;
      if (!text || typeof text !== 'string') {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Text is required for TTS' } });
        return;
      }
      const result = await TtsService.synthesizeSpeech({ text, voicePersona, language, speechRate });
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[VideoController.synthesizeSpeech] Error:', err);
      res.status(500).json({ success: false, error: { code: 'TTS_ERROR', message: err.message } });
    }
  }
}
