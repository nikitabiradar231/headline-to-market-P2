import { LLMProvider, LLMGenerateOptions } from './provider.js';
import { LLMResponse } from '../../shared/schema.js';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'Deterministic Mock Provider';

  public async generateMarket(options: LLMGenerateOptions): Promise<LLMResponse> {
    const headline = options.headline.trim();
    const snippet = options.snippet?.trim() || '';
    const referenceTime = options.referenceTime || new Date();
    const futureDate = new Date(referenceTime.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
    const futureIso = futureDate.toISOString();

    const lowerHeadline = headline.toLowerCase();
    const lowerSnippet = snippet.toLowerCase();
    const combined = `${lowerHeadline} ${lowerSnippet}`;

    // 1. Prompt Injection Detection
    if (
      combined.includes('ignore previous') ||
      combined.includes('ignore all') ||
      combined.includes('bypass') ||
      combined.includes('jailbreak') ||
      combined.includes('system prompt') ||
      combined.includes('output outcome=market') ||
      combined.includes('approve automatically') ||
      combined.includes('disregard rules')
    ) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'prompt_injection_attempt',
        reason:
          'Untrusted news input contains adversarial prompt injection instructions attempting to override validation rules or model directives.',
        suggestedRevision: 'Provide the factual news headline without embedded control instructions.',
      };
    }

    // 2. Specific Golden Set Matches

    // Case 2: Vague improvement
    if (lowerHeadline.includes('traffic improve') || lowerHeadline.includes('bengaluru traffic')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'subjective',
        reason:
          'The term "improve" is inherently subjective and lacks a measurable congestion metric, target percentage, or official monitoring baseline.',
        suggestedRevision:
          'Will Bengaluru\'s average TomTom Congestion Index decrease by at least 10% year-over-year in the 2026 Annual Report?',
      };
    }

    // Case 3: Subjective quality
    if (lowerHeadline.includes('economy perform well') || lowerHeadline.includes('perform well')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'subjective',
        reason:
          '"Perform well" is an undefined value judgment. Economic health must be quantified using specific metrics like GDP growth rate, CPI inflation, or industrial output.',
        suggestedRevision:
          'Will India\'s real GDP growth rate exceed 6.5% for Fiscal Year 2026-27 according to the Ministry of Statistics and Programme Implementation (MoSPI)?',
      };
    }

    // Case 4: Ambiguous event
    if (lowerHeadline.includes('do something big') || lowerHeadline.includes('something big')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'ambiguous',
        reason:
          '"Do something big soon" contains no specific corporate action, no defined monetary threshold, and no verifiable event boundary.',
        suggestedRevision:
          'Will the company announce a merger or acquisition valued at over $1 billion before December 31, 2026 in an official SEC 8-K filing?',
      };
    }

    // Case 6: Missing deadline
    if (
      lowerHeadline.includes('launch its product') ||
      lowerHeadline.includes('iphone fold') ||
      lowerHeadline.includes('foldable iphone')
    ) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'missing_deadline',
        reason:
          'Product launch predictions require a specific deadline date or reporting quarter to avoid open-ended indeterminacy.',
        suggestedRevision:
          'Will Apple commercially release a foldable iPhone before November 30, 2027 according to an official Apple Newsroom press release?',
      };
    }

    // Case 7: Unverifiable rumor
    if (lowerHeadline.includes('secretly') || lowerHeadline.includes('secretly buy')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'future_not_verifiable',
        reason:
          'Secret transactions cannot be objectively resolved by public registries. Public markets require authoritative disclosure.',
        suggestedRevision:
          'Will regulatory filings with the SEC or national trade authority disclose an equity acquisition of XYZ by the named party before year-end?',
      };
    }

    // Case 10: Expired deadline / past event
    if (lowerHeadline.includes('2020 us presidential election') || lowerHeadline.includes('in 2020')) {
      return {
        outcome: 'market',
        question: 'Was the 2020 US Presidential Election certified by Congress on January 6-7, 2021?',
        closeAt: '2021-01-07T12:00:00Z', // Past date intentionally to trigger server-side semantic time validation
        resolutionSource: 'US National Archives and Congressional Record',
        resolutionSourceUrl: 'https://www.archives.gov',
        yesCriteria: 'Official Congressional certification completed.',
        noCriteria: 'Certification not completed by deadline.',
        resolutionRules: 'Resolved according to the Congressional Record published on archives.gov.',
        edgeCases: 'If postponed, resolves upon subsequent certification.',
        rationale: 'Historical event with official government record.',
      };
    }

    // Case 11: Conflicting authoritative sources
    if (lowerHeadline.includes('conflicting') || lowerHeadline.includes('disputed border clash')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'no_authoritative_source',
        reason:
          'Multiple primary parties publish irreconcilable data with no single pre-agreed authoritative arbiter designated in the headline.',
        suggestedRevision:
          'Specify which single named neutral agency (e.g., UN OCHA Situation Report) serves as the sole resolving oracle.',
      };
    }

    // Case 12: Missing numerical thresholds
    if (lowerHeadline.includes('inflation drop significantly')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'ambiguous',
        reason:
          '"Significantly" is unquantified. The market must specify an exact percentage or basis-point drop.',
        suggestedRevision:
          'Will headline CPI inflation fall below 4.0% in the October 2026 release by the Ministry of Statistics?',
      };
    }

    // Case 13: Unclear geographic scope
    if (lowerHeadline.includes('new tax rules take effect by july')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'ambiguous',
        reason:
          'The headline lacks jurisdiction/geographic scope (e.g., federal, state, or specific country).',
        suggestedRevision:
          'Will the Indian Ministry of Finance notify the proposed Direct Tax Code rules in the Gazette of India by July 31, 2027?',
      };
    }

    // Case 14: Unclear reporting period
    if (lowerHeadline.includes('record profits this fiscal year')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'insufficient_information',
        reason:
          'Fiscal years vary across companies and jurisdictions; exact fiscal calendar year and audited report release must be stated.',
        suggestedRevision:
          'Will XYZ Corp report audited FY27 net profit exceeding $5.0 billion in its annual SEC 10-K filing?',
      };
    }

    // Case 15: Deadline too close
    if (lowerHeadline.includes('trade higher in 2 minutes') || lowerHeadline.includes('in 2 minutes')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'missing_deadline',
        reason:
          'A 2-minute deadline is too narrow to permit fair human participation, order book formation, or reliable settlement review.',
        suggestedRevision:
          'Will the index close higher than its open at the end of the standard trading session today (16:00 EST)?',
      };
    }

    // Case 16: Valid election result
    if (lowerHeadline.includes('karnataka assembly election') || lowerHeadline.includes('candidate x')) {
      return {
        outcome: 'market',
        question:
          'Will Candidate X be declared the elected MLA for the designated constituency in the Karnataka Assembly Election?',
        closeAt: '2028-05-15T18:00:00+05:30',
        resolutionSource: 'Election Commission of India (ECI)',
        resolutionSourceUrl: 'https://results.eci.gov.in',
        yesCriteria: 'The Election Commission of India official results portal lists Candidate X as WON.',
        noCriteria:
          'The Election Commission of India official results portal lists any other candidate as WON or election is countermanded.',
        resolutionRules:
          'Settled strictly on Form 20 / Form 21E certificate of election published on results.eci.gov.in.',
        edgeCases:
          'If a recount is ordered prior to certification, settlement waits for final official declaration. Judicial election petitions filed post-declaration do not delay settlement.',
        rationale: 'ECI is the constitutional statutory authority with indisputable election result certificates.',
      };
    }

    // Case 17: Sports result
    if (lowerHeadline.includes('arsenal defeat chelsea') || lowerHeadline.includes('premier league match')) {
      return {
        outcome: 'market',
        question:
          'Will Arsenal FC defeat Chelsea FC in their Premier League fixture scheduled for May 10, 2027?',
        closeAt: '2027-05-10T23:59:00Z',
        resolutionSource: 'The Football Association Premier League Official Match Centre',
        resolutionSourceUrl: 'https://www.premierleague.com',
        yesCriteria:
          'The official Premier League match report records Arsenal as having scored strictly more goals than Chelsea at full-time.',
        noCriteria:
          'The official Premier League match report records a draw or Chelsea victory at full-time.',
        resolutionRules:
          'Determined solely by official Premier League final scoreline including stoppage time. Extra time/penalties do not apply to regular league matches.',
        edgeCases:
          'If the match is postponed or cancelled and not replayed within 48 hours of original kickoff, this market resolves VOID and all wagers are returned.',
        rationale:
          'Premier League Match Centre provides definitive official scorelines with clear abandonment and postponement rules.',
      };
    }

    // Case 18: Company earnings threshold
    if (lowerHeadline.includes('apple report q3') || lowerHeadline.includes('iphone revenue exceeding')) {
      return {
        outcome: 'market',
        question:
          'Will Apple Inc. report Q3 FY2027 iPhone net sales exceeding $40.0 billion in its official SEC Form 10-Q filing?',
        closeAt: '2027-08-15T23:59:00-04:00',
        resolutionSource: 'U.S. Securities and Exchange Commission (SEC EDGAR)',
        resolutionSourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
        yesCriteria:
          'Apple Inc. Form 10-Q for the quarterly period ended June 26, 2027 reports "iPhone" net sales strictly greater than $40,000 million.',
        noCriteria:
          'Apple Inc. Form 10-Q reports iPhone net sales equal to or less than $40,000 million, or product segment is discontinued.',
        resolutionRules:
          'Resolution relies exclusively on the Segment Information or Revenue by Product Category table in the quarterly 10-Q filed with SEC EDGAR.',
        edgeCases:
          'Restatements filed after the initial 10-Q filing date shall not be considered. In the event of an SEC filing delay or cancellation beyond August 15, 2027, market resolves once filed or VOID if delayed past September 30, 2027.',
        rationale: 'Audited statutory SEC filing provides non-negotiable legal revenue disclosure.',
      };
    }

    // Case 19: Fake / unverified source domain
    if (lowerHeadline.includes('totallyfakepredictionblog') || lowerHeadline.includes('fake blog')) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'no_authoritative_source',
        reason:
          'The resolution source domain (totallyfakepredictionblog1234.org) is an unverified blog and lacks institutional credibility.',
        suggestedRevision:
          'Name an established regulatory authority, statutory registry, or accredited news organization as the resolution oracle.',
      };
    }

    // Case 20: Insufficient context
    if (lowerHeadline.includes('it happened again yesterday') || lowerHeadline.length < 15) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'insufficient_information',
        reason:
          'The headline lacks subject, entity, verifiable action, and event description necessary to construct any prediction question.',
        suggestedRevision: 'Supply the full news context naming the entity, event, and projected future milestone.',
      };
    }

    // Case 1: Objective announcement (RBI meeting)
    if (lowerHeadline.includes('rbi') && lowerHeadline.includes('repo rate')) {
      return {
        outcome: 'market',
        question:
          'Will the Reserve Bank of India (RBI) Monetary Policy Committee announce a reduction in the benchmark repo rate at its December 2026 scheduled policy meeting?',
        closeAt: '2026-12-08T18:00:00+05:30',
        resolutionSource: 'Reserve Bank of India (RBI) Monetary Policy Statement',
        resolutionSourceUrl: 'https://www.rbi.org.in',
        yesCriteria:
          'The official RBI Monetary Policy Statement published on rbi.org.in confirms a policy repo rate strictly lower than the rate prevailing immediately prior to the meeting.',
        noCriteria:
          'The official RBI Monetary Policy Statement confirms no change in the repo rate, an increase in the repo rate, or the scheduled meeting is adjourned without a rate decision.',
        resolutionRules:
          'Resolved strictly by the official press release of the Monetary Policy Committee resolution published on the RBI website on the announcement date.',
        edgeCases:
          'If the meeting is rescheduled, close time extends to the revised scheduled resolution announcement date. An unscheduled off-cycle rate cut does not settle this scheduled meeting market unless specified by RBI as replacing it.',
        rationale:
          'The RBI MPC publishes binding, public policy statements with scheduled decision dates and definite numerical policy interest rates.',
      };
    }

    // Case 5: Measurable target
    if (lowerHeadline.includes('reliance') && (lowerHeadline.includes('revenue') || lowerHeadline.includes('lakh crore'))) {
      return {
        outcome: 'market',
        question:
          'Will Reliance Industries Limited report consolidated quarterly revenue from operations exceeding ₹2.50 lakh crore for Q3 FY27 in its official BSE/NSE filing?',
        closeAt: '2027-01-31T23:59:00+05:30',
        resolutionSource: 'BSE India Official Corporate Announcements (Reliance Industries Ltd)',
        resolutionSourceUrl: 'https://www.bseindia.com',
        yesCriteria:
          'Unaudited or audited consolidated financial results submitted to BSE India report "Revenue from Operations" strictly greater than ₹2,50,000 crore for the quarter ended December 31, 2026.',
        noCriteria:
          'Consolidated Revenue from Operations is reported as less than or equal to ₹2,50,000 crore, or results are not filed by the close date.',
        resolutionRules:
          'Settled based on the line item "Revenue from Operations" in the consolidated financial statements filed on the BSE corporate filing portal.',
        edgeCases:
          'Subsequent revisions or restatements after the initial regulatory filing shall not alter settlement. If RIL changes reporting standards, equivalent gross operating revenue applies.',
        rationale:
          'Statutory corporate financial reporting to stock exchanges provides a verifiable, audited public disclosure.',
      };
    }

    // Case 8: Paris Marathon cancellation
    if (lowerHeadline.includes('paris') && (lowerHeadline.includes('marathon') || lowerHeadline.includes('event'))) {
      return {
        outcome: 'market',
        question:
          'Will the 2027 Schneider Electric Paris Marathon take place on its scheduled date of April 11, 2027 without full cancellation or postponement?',
        closeAt: '2027-04-11T23:59:00+02:00',
        resolutionSource: 'Amaury Sport Organisation (A.S.O.) Official Paris Marathon Notice',
        resolutionSourceUrl: 'https://www.schneiderelectricparismarathon.com',
        yesCriteria:
          'The official race organizers (A.S.O.) conduct the official mass marathon in Paris on April 11, 2027 and publish verified finisher results.',
        noCriteria:
          'The race organizers announce cancellation, indefinite postponement, or postpone the race to a date after April 11, 2027.',
        resolutionRules:
          'Settled via the official press release of A.S.O. and the published official race results.',
        edgeCases:
          'If the race is cancelled or postponed to any later date, it resolves NO. If shortened due to weather but held on the scheduled date, it resolves YES.',
        rationale:
          'Major international sporting events have designated organizing bodies with official press bulletins and verified participant timings.',
      };
    }

    // 3. Fallback generic analysis
    // If contains vague verbs and no numbers: reject
    if (
      (lowerHeadline.includes('improve') ||
        lowerHeadline.includes('better') ||
        lowerHeadline.includes('popular') ||
        lowerHeadline.includes('successful') ||
        lowerHeadline.includes('big') ||
        lowerHeadline.includes('soon')) &&
      !/\d+/.test(headline)
    ) {
      return {
        outcome: 'unresolvable',
        reasonCode: 'subjective',
        reason:
          'The headline uses qualitative terms that lack an objective measurement standard, specific threshold, or designated authoritative reporting index.',
        suggestedRevision: `Specify a quantified metric (e.g., percentage change, financial amount) and an authoritative reporting source for "${headline.slice(0, 40)}...".`,
      };
    }

    // Default valid market generation for general factual headlines
    return {
      outcome: 'market',
      question: `Will the event described in "${headline.slice(0, 60)}" be officially confirmed before ${futureIso.slice(0, 10)}?`,
      closeAt: futureIso,
      resolutionSource: 'Relevant Official Regulatory Authority or Primary Press Bulletin',
      resolutionSourceUrl: 'https://news.google.com',
      yesCriteria: 'Official confirmation or verification published by the primary authority by the close date.',
      noCriteria: 'No official confirmation published by the close date, or event explicitly disproven.',
      resolutionRules:
        'Settled strictly based on public documentation released by the designated primary authority.',
      edgeCases:
        'If the announcement is postponed past the close date, this market resolves NO unless an explicit extension was stipulated.',
      rationale:
        'Standard event with a defined close deadline and explicit binary verification criteria.',
    };
  }
}
