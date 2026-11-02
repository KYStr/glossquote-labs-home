# Exact Dice Sum Distribution — preparatory BRIEF v0.1

Specification documentary candidate, prepared2026-11-01UTC. No implementation/claim/readiness; all product checks NOT_RUN, nine scores null.

## 1. Goal and outcome
A probability learner calculates the complete distribution of the sum of a small number of identical fair independent dice, reads exact outcome counts/fractions and the probability of meeting a chosen total. Success:2six-sided dice have6of36 orderedoutcomes summing7, and21of36 meetingatleast7, notuniformprobabilityacrosspossible sums. This is amathematical model, notanactualroll, gamblingrecommendation orassessmentofphysicaldicefairness.

## 2. Scope and de-duplication
Inputnumberofdice1..8, facesperdie2..20 (integerfaces1..S), andthreshold0..161forinclusiveeventsum>=threshold. Showallachievablesums/orderedoutcomecounts/exactreducedprobabilities,totaloutcomes,exactmean/variance,thresholdcount/probability. Samefacecountforeachdie, equiprobableindependentfaces. Nodiceanimation/RNG/seed,simulation,savedrolls,customweights,mixeddice,drop/keep/explodingdice,bonuses,bettingpayout/oddsadvice,gameassets,files,downloads,clipboardornetwork. Noapproximatepercentage asauthoritativeoutput; exactfractionis primary.

Existing Random Groups fixedbe197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/17-random-groups/SPEC.md acceptsnames,usescryptographicFisher–Yates andproducesonebalancedrandomassignment. This proposaldoesnotuseanyrandomsourceorparticipants; itcountsalltheoreticalorderedfaceoutcomesbynumericalsum. OptionMatrixenumeratesuser-definedstringtuples,butthisworkflowdoesnotdisplayorstoretuplesandcalculatesexactdistribution/events. RationalArithmetic'stwofractions/fouroperationsdoesnotmodeldiceorconvolveadistribution. Catalog56andregistry493all88specspluspendingBoolean/Linearnotmatchingthisstatisticalworkflow. Freshregistry/draft/pathcheckbeforeadmission; preserveexistingowners. Asharedfractionreducerisnotpermissiontocopytheirimplementation.

Themodelassumptionsareexplicitmathematics:eachorderedtuplehasprobability1/S^Nunderfairnessandindependence. Thetoolcannotestablishthoseassumptionsforrealobjects. NoexternalprobabilityAPI,observationaldataset orpredictionclaim.

## Required deliverable and independent gate

Full normative contract is SPEC.md: eight required sections, raw/control/state/schema, bounded exact algorithm/output, independent literal fixtures, nine-aspect product rubric, all mandatory native/boundary/timing tests and handoff. Non-author individually checks goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff; missing/contradictory required behavior blocks readiness. Author does not self-ready.

Current product checks NOT_RUN and scores null. Future each of nine aspects must independently reach >=90 with all mandatory same-candidate checks complete, never inferred from document presence or CPU counts. Source saving, valid registration, independent ready, production claim, product acceptance and deployment remain separate. No new dependency, game resource, owner change, private input publication or deployment.
