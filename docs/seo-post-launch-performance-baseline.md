# SEO post-launch performance baseline

## Test context

- Date: August 5, 2026
- Target: live production at `https://rukhlabs.com`
- Production commit: `ad5d4c3dabc2c69b57d56183fa027ce93665f87e`
- Tool: Lighthouse 13.4.1
- Browser: Headless Chrome 151 on Windows 10
- Profiles: Lighthouse default mobile emulation for five routes and the
  Lighthouse desktop preset for one homepage run
- Categories: Performance, Accessibility, Best Practices, and SEO

Each value below is a single lab run. These results are not field Core Web
Vitals, do not establish CrUX availability, and can vary with the test machine,
network, server response, and third-party delivery. Lighthouse did not provide
lab INP for these page loads, so Total Blocking Time (TBT) is recorded as the
available responsiveness proxy.

## Results

| Profile | Tested URL | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | `https://rukhlabs.com/` | 80 | 96 | 100 | 100 | 2,797 ms | 0 | 513 ms |
| Mobile | `https://rukhlabs.com/services/web-development` | 91 | 87 | 100 | 100 | 2,671 ms | 0 | 176 ms |
| Mobile | `https://rukhlabs.com/services/career-portfolios` | 93 | 96 | 100 | 100 | 2,809 ms | 0 | 105 ms |
| Mobile | `https://rukhlabs.com/insights/data-analyst-career-portfolio-guide` | 94 | 96 | 100 | 100 | 2,660 ms | 0 | 81 ms |
| Mobile | `https://rukhlabs.com/tools/website-project-brief` | 95 | 96 | 100 | 100 | 2,479 ms | 0 | 89 ms |
| Desktop | `https://rukhlabs.com/` | 100 | 96 | 100 | 100 | 570 ms | 0 | 0 ms |

## Findings and scope decision

- Every tested production route scored 100 in Best Practices and SEO.
- CLS was 0 in all six runs.
- The homepage mobile run showed the largest lab responsiveness cost at 513 ms
  TBT. One run is not enough to treat that value as a reproducible regression,
  and no content was removed or redesigned to chase a score.
- The website-development accessibility result exposed invalid ordered-list
  markup around the four-step process. This is a reproducible, low-risk semantic
  defect and is corrected in the hardening branch.
- Repeated footer text failed automated contrast checks on the tested pages. The
  hardening branch raises that text contrast without changing copy or layout.
- Homepage link-label checks identified decorative fictional-preview text and a
  redundant Google Play label. The branch hides preview artwork from the
  accessibility tree while keeping concise link names, and removes the redundant
  label override.
- Some intentionally miniature text inside fictional design-preview artwork also
  triggered contrast observations. Those previews are visual examples rather
  than primary page copy; a broad visual rewrite was not included in this narrow
  SEO hardening pass.

Chrome emitted intermittent Windows temporary-profile cleanup warnings after
writing some reports. All six JSON reports were present, parsed successfully,
identified the requested final URLs, and contained complete category scores and
lab metrics. The raw reports were retained outside the repository as temporary
test artifacts and were not committed.

After this branch is eventually deployed, repeat the same runs over several
samples before making performance changes, and compare field data only if a
reliable CrUX sample becomes available.
