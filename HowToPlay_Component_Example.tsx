import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * LottoDrop How To Play Component
 *
 * Consulting React Frontend Expert for optimal performance...
 * Consulting Casino Animation Specialist for smooth micro-interactions...
 * Consulting Elite Gaming UX Designer for accessibility compliance...
 */

interface HowToPlayProps {
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  highlightSection?: string;
  onStepComplete?: (stepId: string) => void;
}

interface GameStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: string;
  ctaText: string;
  ctaAction: () => void;
}

interface GameMechanic {
  id: string;
  title: string;
  description: string;
  icon: string;
  probability?: number;
  details: string[];
}

interface AdvancedFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  benefits: string[];
  premium?: boolean;
}

const HowToPlay: React.FC<HowToPlayProps> = ({
  userLevel = 'beginner',
  highlightSection,
  onStepComplete
}) => {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const heroRef = useRef<HTMLElement>(null);
  const isHeroInView = useInView(heroRef, { once: true });

  // Game steps data
  const gameSteps: GameStep[] = [
    {
      id: 'create-account',
      number: 1,
      title: 'Create Your Account',
      description: 'Sign up in seconds with just an email and secure password. No complex verification required.',
      icon: '👤',
      ctaText: 'Sign Up Now',
      ctaAction: () => onStepComplete?.('create-account')
    },
    {
      id: 'fund-account',
      number: 2,
      title: 'Add Funds',
      description: 'Deposit using crypto or traditional payment methods. Minimum $5 to start playing.',
      icon: '💳',
      ctaText: 'Add Funds',
      ctaAction: () => onStepComplete?.('fund-account')
    },
    {
      id: 'choose-numbers',
      number: 3,
      title: 'Pick Your Numbers',
      description: 'Select 6 lucky numbers from 1-49, or use Quick Pick for random selection.',
      icon: '🎱',
      ctaText: 'Try Quick Pick',
      ctaAction: () => onStepComplete?.('choose-numbers')
    },
    {
      id: 'join-round',
      number: 4,
      title: 'Join the Round',
      description: 'Enter the current round or schedule entries for future draws.',
      icon: '🎯',
      ctaText: 'Join Now',
      ctaAction: () => onStepComplete?.('join-round')
    },
    {
      id: 'wait-draw',
      number: 5,
      title: 'Watch the Draw',
      description: 'Live draws every 15 minutes using provably fair VRF technology.',
      icon: '⏰',
      ctaText: 'View Live Draw',
      ctaAction: () => onStepComplete?.('wait-draw')
    },
    {
      id: 'check-results',
      number: 6,
      title: 'Claim Your Prize',
      description: 'Winners are notified instantly. Prizes credited automatically to your account.',
      icon: '🏆',
      ctaText: 'Check Results',
      ctaAction: () => onStepComplete?.('check-results')
    }
  ];

  // Game mechanics data
  const gameMechanics: GameMechanic[] = [
    {
      id: 'random-selection',
      title: 'Provably Fair Random Generation',
      description: 'Our VRF (Verifiable Random Function) ensures every draw is completely random and verifiable.',
      icon: '🎲',
      probability: 100,
      details: [
        'Chainlink VRF integration',
        'Cryptographic proof of randomness',
        'On-chain verification available',
        'No house manipulation possible'
      ]
    },
    {
      id: 'prize-distribution',
      title: 'Dynamic Prize Pools',
      description: 'Prize pools grow with participation. Multiple ways to win across different match levels.',
      icon: '💰',
      details: [
        '6 numbers: 60% of prize pool',
        '5 numbers: 20% of prize pool',
        '4 numbers: 15% of prize pool',
        '3 numbers: 5% of prize pool'
      ]
    },
    {
      id: 'winning-odds',
      title: 'Transparent Odds',
      description: 'Clear, published odds for every prize tier. No hidden mechanics or changing rules.',
      icon: '📊',
      probability: 85,
      details: [
        '6/6 numbers: 1 in 13,983,816',
        '5/6 numbers: 1 in 54,201',
        '4/6 numbers: 1 in 1,032',
        '3/6 numbers: 1 in 57'
      ]
    }
  ];

  // Advanced features data
  const advancedFeatures: AdvancedFeature[] = [
    {
      id: 'vip-program',
      title: 'VIP Rewards Program',
      description: 'Earn points with every play. Unlock exclusive benefits and higher prize pools.',
      icon: '👑',
      badge: 'EXCLUSIVE',
      premium: true,
      benefits: [
        'Exclusive VIP-only rounds',
        'Higher prize multipliers',
        'Priority customer support',
        'Early access to new features'
      ]
    },
    {
      id: 'auto-play',
      title: 'Smart Auto-Play',
      description: 'Set your favorite numbers and let the system play for you automatically.',
      icon: '⚡',
      benefits: [
        'Never miss a draw',
        'Automated number selection',
        'Customizable play schedules',
        'Budget controls included'
      ]
    },
    {
      id: 'analytics',
      title: 'Player Analytics',
      description: 'Track your performance with detailed statistics and winning patterns.',
      icon: '📈',
      benefits: [
        'Win/loss tracking',
        'Number frequency analysis',
        'ROI calculations',
        'Historical performance data'
      ]
    }
  ];

  // Floating lottery balls data
  const lotteryBalls = [
    { number: 7, top: '20%', left: '10%', delay: 0 },
    { number: 21, top: '60%', left: '85%', delay: 2 },
    { number: 42, top: '40%', left: '5%', delay: 4 },
    { number: 13, top: '80%', left: '75%', delay: 1 },
    { number: 35, top: '10%', left: '90%', delay: 3 }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };

  const ballVariants = {
    float: {
      y: [-20, 20, -20],
      rotate: [0, 360],
      transition: {
        y: {
          repeat: Infinity,
          duration: 6,
          ease: 'easeInOut'
        },
        rotate: {
          repeat: Infinity,
          duration: 8,
          ease: 'linear'
        }
      }
    }
  };

  return (
    <div className="how-to-play">
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="hero-section"
        initial="hidden"
        animate={isHeroInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <div className="hero-content">
          <motion.h1 className="hero-title" variants={itemVariants}>
            How to Play LottoDrop
          </motion.h1>
          <motion.p className="hero-subtitle" variants={itemVariants}>
            Join thousands of players in the most transparent and exciting lottery experience.
            Start winning in under 2 minutes!
          </motion.p>
        </div>

        {/* Floating Lottery Balls */}
        <div className="floating-balls" aria-hidden="true">
          {lotteryBalls.map((ball, index) => (
            <motion.div
              key={index}
              className="lottery-ball"
              style={{
                top: ball.top,
                left: ball.left
              }}
              variants={ballVariants}
              animate="float"
              initial={{ opacity: 0, scale: 0 }}
              transition={{
                opacity: { delay: ball.delay, duration: 0.5 },
                scale: { delay: ball.delay, duration: 0.5 }
              }}
            >
              {ball.number}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Quick Start Guide */}
      <section className="quick-start">
        <div className="section-container">
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Quick Start Guide
          </motion.h2>

          <motion.div
            className="steps-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            {gameSteps.map((step, index) => (
              <motion.div
                key={step.id}
                className={`step-card ${highlightSection === step.id ? 'highlighted' : ''}`}
                variants={itemVariants}
                whileHover={{
                  y: -5,
                  transition: { type: 'spring', stiffness: 300 }
                }}
                onHoverStart={() => setActiveStep(step.id)}
                onHoverEnd={() => setActiveStep(null)}
              >
                <div className="step-number">{step.number}</div>
                <div className="step-icon" aria-hidden="true">
                  {step.icon}
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                <button
                  className="step-cta"
                  onClick={step.ctaAction}
                  aria-label={`${step.ctaText} - ${step.title}`}
                >
                  {step.ctaText}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Game Mechanics */}
      <section className="game-mechanics">
        <div className="section-container">
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            How It Works
          </motion.h2>

          <motion.div
            className="mechanics-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            {gameMechanics.map((mechanic) => (
              <motion.div
                key={mechanic.id}
                className="mechanic-card"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="mechanic-header">
                  <div className="mechanic-icon" aria-hidden="true">
                    {mechanic.icon}
                  </div>
                  <h3 className="mechanic-title">{mechanic.title}</h3>
                </div>
                <p className="mechanic-description">{mechanic.description}</p>

                {mechanic.probability && (
                  <div className="probability-container">
                    <div className="probability-bar">
                      <motion.div
                        className="probability-fill"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${mechanic.probability}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                    <small>Fairness Rating: {mechanic.probability}%</small>
                  </div>
                )}

                <ul className="mechanic-details">
                  {mechanic.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="advanced-features">
        <div className="section-container">
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Advanced Features
          </motion.h2>

          <motion.div
            className="feature-showcase"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            {advancedFeatures.map((feature) => (
              <motion.div
                key={feature.id}
                className={`feature-card ${feature.premium ? 'premium' : ''}`}
                variants={itemVariants}
                whileHover={{
                  y: -10,
                  transition: { type: 'spring', stiffness: 300 }
                }}
              >
                {feature.badge && (
                  <div className="feature-badge">{feature.badge}</div>
                )}

                <div className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>

                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>

                <ul className="feature-benefits">
                  {feature.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Screenshot Placeholders */}
      <section className="screenshots-section">
        <div className="section-container">
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            See It In Action
          </motion.h2>

          <div className="screenshot-grid">
            {[
              'Mobile Game Interface',
              'Live Draw Animation',
              'Winner Celebration',
              'Analytics Dashboard'
            ].map((caption, index) => (
              <motion.div
                key={index}
                className="screenshot-container"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="screenshot-placeholder">
                  Screenshot: {caption}
                </div>
                <p className="screenshot-caption">{caption}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowToPlay;