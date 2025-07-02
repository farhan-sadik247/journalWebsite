# Article Publishing Workflow Examples

## ✅ **VALID PUBLISHING SCENARIOS**

### Single Article Publishing
```
Issue 1, Volume 1
├── Article A (Author Approved) ✅
└── Publish Button: ENABLED ✅
    Result: Issue published with 1 article
```

### Multiple Article Publishing  
```
Issue 2, Volume 1
├── Article B (Author Approved) ✅
├── Article C (Author Approved) ✅
├── Article D (Author Approved) ✅
└── Publish Button: ENABLED ✅
    Result: Issue published with 3 articles
```

## ❌ **INVALID PUBLISHING SCENARIOS**

### No Articles Assigned
```
Issue 3, Volume 1
├── (No articles assigned)
└── Publish Button: DISABLED ❌
    Error: "Cannot publish issue without assigned manuscripts"
```

### Mixed Approval Status
```
Issue 4, Volume 1
├── Article E (Author Approved) ✅
├── Article F (Under Review) ❌
└── Publish Button: ENABLED but will fail ❌
    Error: "1 manuscript(s) are not in author-approved status"
```

### Individual Article Publishing (NOT SUPPORTED)
```
Article G (Author Approved)
└── Individual Publish Button: DOES NOT EXIST ❌
    Rule: Articles can ONLY be published through issues
```

## 🔄 **WORKFLOW SUMMARY**

1. **Manuscript Approval**: Article reaches "Author Approved" status
2. **Assignment**: Editor assigns approved articles to unpublished issues
3. **Publishing**: Editor clicks "Publish Issue & Articles" (works with 1 or more articles)
4. **Public Access**: All articles in the published issue become publicly searchable

## 🎯 **KEY POINTS**

- ✅ Issues can be published with **any number** of articles (1, 2, 3, etc.)
- ✅ All assigned articles must be "Author Approved"
- ❌ Individual article publishing is **not supported**
- ✅ Once published, articles are individually searchable and downloadable
- ✅ Articles remain organized within their issue/volume structure
