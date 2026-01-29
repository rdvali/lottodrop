/**
 * SEO FAQ Section Component
 *
 * Accordion-style FAQ section with schema.org FAQPage structured data.
 * ISOLATED: No dependencies on game logic.
 */

import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import styles from './SEOFAQSection.module.css'

export interface FAQItem {
  question: string
  answer: string
}

interface SEOFAQSectionProps {
  title?: string
  subtitle?: string
  faqs: FAQItem[]
  includeSchema?: boolean
}

export const SEOFAQSection: React.FC<SEOFAQSectionProps> = ({
  title = 'Frequently Asked Questions',
  subtitle,
  faqs,
  includeSchema = true
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  // Generate FAQPage schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <section className={styles.section}>
      {includeSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        </Helmet>
      )}

      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.faqList}>
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`${styles.faqItem} ${openIndex === index ? styles.open : ''}`}
          >
            <button
              className={styles.question}
              onClick={() => toggleFAQ(index)}
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <span className={styles.questionText}>{faq.question}</span>
              <span className={styles.icon}>
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            <div
              id={`faq-answer-${index}`}
              className={styles.answer}
              role="region"
              aria-labelledby={`faq-question-${index}`}
            >
              <p className={styles.answerText}>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SEOFAQSection
