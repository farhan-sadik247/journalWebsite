# Global Journal of Advanced Technology

A comprehensive academic journal management system built with Next.js, featuring a complete manuscript submission, peer review, and publication workflow.

## 🌟 Overview

The Global Journal of Advanced Technology platform is a full-featured academic publishing system that manages the entire lifecycle of scholarly articles from submission to publication. The system supports multiple user roles with distinct permissions and workflows, ensuring a smooth editorial process.

**Motto**: *Innovating the Future, One Breakthrough at a Time*

## Live Demo

🌐 **[View Live Application](https://gjadt.vercel.app/)**

Experience the full functionality of the Academic Journal Management System with our live demo deployment.

## 🚀 Key Features

- **Multi-role User Management** (Author, Reviewer, Editor, Copy Editor, Admin)
- **Complete Manuscript Workflow** (Submission → Review → Copy Editing → Publication)
- **Peer Review System** with double-blind review support
- **Professional Copy Editing** workflow
- **Publication Management** with volumes and issues
- **Payment Processing** for publication fees
- **Advanced Search** and article browsing
- **Editorial Board Management**
- **Analytics and Reporting**
- **Responsive Design** for all devices

## Technology Stack

### Frontend Technologies
- **Next.js 13+**: React framework with App Router for server-side rendering and static generation
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript for better development experience
- **SCSS Modules**: Modular CSS with Sass preprocessing for component-scoped styling
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox

### Backend Technologies
- **Next.js API Routes**: Server-side API endpoints with built-in middleware support
- **Node.js**: JavaScript runtime for server-side operations
- **MongoDB**: NoSQL document database for flexible data storage
- **Mongoose**: MongoDB object modeling for Node.js with schema validation

### Authentication & Security
- **NextAuth.js**: Complete authentication solution with multiple providers
- **Google OAuth 2.0**: Secure authentication via Google accounts
- **JWT (JSON Web Tokens)**: Stateless authentication tokens
- **bcrypt**: Password hashing for credential-based authentication
- **CSRF Protection**: Cross-site request forgery prevention

### File Storage & Media
- **Cloudinary**: Cloud-based image and video management service
- **Multer**: Middleware for handling multipart/form-data file uploads
- **File Type Validation**: Server-side file type and size validation
- **Image Optimization**: Automatic image compression and format conversion

### Email & Communication
- **Nodemailer**: Email sending library for notifications
- **SMTP Integration**: Support for various email providers (Gmail, Outlook, etc.)
- **Email Templates**: Dynamic HTML email templates with variables
- **Notification System**: Real-time notifications for workflow events


### Database Schema
- **User Management**: Comprehensive user profiles with role-based permissions
- **Manuscript Workflow**: Complete manuscript lifecycle tracking
- **Review System**: Peer review assignments and feedback storage
- **Payment Records**: Transaction history and verification status
- **Analytics Data**: Usage statistics and performance metrics

### Deployment & Infrastructure
- **Vercel**: Recommended deployment platform for Next.js applications
- **MongoDB Atlas**: Cloud-hosted MongoDB database service
- **Environment Variables**: Secure configuration management
- **CDN Integration**: Content delivery network for static assets

### API Architecture
- **RESTful APIs**: Standard HTTP methods for CRUD operations
- **Middleware Chain**: Request validation, authentication, and error handling
- **Rate Limiting**: API request throttling for security
- **Data Validation**: Input sanitization and validation using Joi/Zod
- **Error Handling**: Consistent error responses across all endpoints

## 👥 User Roles & Permissions

### 1. **Author** 📝
*Default role for new registrations*

**Core Functionalities:**
- **Manuscript Submission**
  - Submit new manuscripts with files (PDF, DOC, DOCX, ZIP up to 50MB)
  - Multi-step submission form with validation
  - Add multiple authors with ORCID support
  - Specify corresponding author
  - Select research categories
  - Add keywords, funding information, ethics statements
  - Suggest or exclude reviewers

- **Manuscript Management**
  - View all submitted manuscripts in dashboard
  - Track manuscript status in real-time
  - Download submission files
  - View review comments and recommendations
  - Submit revisions when requested
  - Respond to copy editor queries
  - Approve final galley proofs

- **Payment Management**
  - View publication fee requirements
  - Process payments via Stripe integration
  - Track payment status
  - Access fee waivers (for eligible countries like Bangladesh)

- **Profile Management**
  - Update personal information and affiliation
  - Add ORCID ID and expertise areas
  - Upload profile picture
  - Apply for role promotion to Editor

### 2. **Reviewer** 🔍
*Invited by editors or promoted from author*

**Core Functionalities:**
- **Review Assignment Management**
  - View assigned manuscript reviews
  - Accept or decline review invitations
  - Track review deadlines
  - Access manuscript files securely

- **Review Process**
  - Conduct double-blind peer reviews
  - Rate manuscripts on multiple criteria:
    - Novelty and originality
    - Technical quality
    - Significance of contribution
    - Clarity of presentation
    - Overall assessment
  - Provide detailed feedback for authors
  - Submit confidential comments to editors
  - Upload review files and annotations

- **Dashboard Features**
  - View review history and statistics
  - Track pending and completed reviews
  - Monitor overdue reviews
  - Access reviewer guidelines

### 3. **Editor** ✏️
*Manages editorial workflow and decisions*

**Core Functionalities:**
- **Manuscript Management**
  - View all submitted manuscripts
  - Assign manuscripts to reviewers
  - Monitor review progress and deadlines
  - Make editorial decisions (accept/reject/revise)
  - Manage revision requests
  - Oversee manuscript quality

- **Reviewer Management**
  - Search and assign reviewers by expertise
  - Send review invitations
  - Monitor reviewer performance
  - Handle reviewer conflicts and replacements
  - Maintain reviewer database

- **Editorial Decisions**
  - Review completed peer reviews
  - Make final acceptance/rejection decisions
  - Request major or minor revisions
  - Provide editorial feedback to authors
  - Manage appeals and disputes

- **Copy Editor Assignment**
  - Assign accepted manuscripts to copy editors
  - Set copy editing deadlines
  - Monitor copy editing progress
  - Review copy editor recommendations

- **Publication Workflow**
  - Prepare manuscripts for publication
  - Assign articles to journal issues
  - Coordinate with production team
  - Manage publication schedules

### 4. **Copy Editor** 📖
*Handles professional editing and proofreading*

**Core Functionalities:**
- **Copy Editing Workflow**
  - Receive assigned manuscripts from editors
  - Download and edit manuscript files
  - Perform comprehensive language editing
  - Check formatting and style consistency
  - Verify references and citations

- **Author Communication**
  - Submit queries to authors for clarification
  - Review author responses to editing queries
  - Coordinate revision cycles
  - Ensure author approval of changes

- **Production Support**
  - Prepare final galley proofs
  - Upload edited files to system
  - Submit completion reports to editors
  - Support typesetting and layout processes

- **Quality Assurance**
  - Perform final proofreading
  - Check compliance with journal standards
  - Verify technical accuracy
  - Ensure publication readiness

### 5. **Administrator** 🛡️
*Full system access and management*

**Core Functionalities:**
- **User Management**
  - View and manage all user accounts
  - Assign and modify user roles
  - Handle role promotion applications
  - Manage user permissions and access
  - Delete or suspend accounts
  - View user activity and statistics

- **System Configuration**
  - Configure publication fees and payment settings
  - Manage journal categories and classifications
  - Set up editorial board structure
  - Configure email templates and notifications
  - Manage system-wide settings

- **Content Management**
  - Update journal information and policies
  - Manage indexing partner information
  - Configure homepage content
  - Update user manuals and guidelines
  - Manage contact information

- **Financial Management**
  - Configure bank details for payments
  - Monitor payment transactions
  - Process fee waivers and exemptions
  - Generate financial reports
  - Manage Stripe integration settings

- **Editorial Board Management**
  - Create designation categories (Editorial Board, Advisory Board)
  - Define specific roles within designations
  - Assign editors and reviewers to special positions
  - Manage board member profiles and responsibilities

- **Analytics and Reporting**
  - View comprehensive system analytics
  - Monitor manuscript submission trends
  - Track review completion rates
  - Generate performance reports
  - Export data for analysis

## 🔐 Authentication & Registration

### Registration Process
1. **Google OAuth Integration**: Primary authentication method
2. **Credentials-based**: Alternative login with email/password
3. **Default Role**: All new users start as "Author"
4. **Email Verification**: Automatic for Google OAuth users

### Role Promotion System
- **Author → Editor**: Authors can apply for editor promotion
- **Editor → Admin**: Editors can apply for administrator privileges
- **Application Process**: 
  - Submit detailed application with motivation, qualifications, and experience
  - Admin review and approval required
  - Notification system for application status updates

## 📋 Manuscript Workflow

### 1. Submission Phase
- Multi-step submission form with validation
- File upload with format verification
- Author information and ORCID integration
- Category selection and keyword tagging
- Optional reviewer suggestions/exclusions

### 2. Editorial Review
- Initial editorial screening
- Reviewer assignment and invitation
- Deadline management and reminders
- Quality control and conflict resolution

### 3. Peer Review Process
- Double-blind review system
- Structured review forms with ratings
- Confidential editor comments
- Author feedback and recommendations
- Review file uploads and annotations

### 4. Editorial Decision
- Comprehensive review analysis
- Accept/reject/revise decisions
- Detailed feedback compilation
- Revision request management
- Appeal process handling

### 5. Copy Editing Phase
- Professional language editing
- Style and format standardization
- Author query management
- Galley proof preparation
- Final approval process

### 6. Publication
- Volume and issue assignment
- DOI assignment and registration
- Online publication and indexing
- Citation tracking and metrics
- Archive management

## 💳 Payment System

### Payment System
- Manual Payment Processing: Bank transfer-based payment system
- Fee Configuration: Flexible fee structure management
- Payment Tracking: Monitor payment status and history
- Bank Configuration: Admin-managed bank account details
- Payment Verification: Manual verification of payment receipts

### Fee Structure
- Fee update by Admin(Fee Config)

## 🔍 Search & Discovery

### Advanced Search Features
- **Full-text Search**: Comprehensive article content search
- **Metadata Filtering**: Filter by author, category, year, volume
- **Keyword Search**: Tag-based article discovery
- **Boolean Operators**: Complex search query support
- **Export Options**: Citation export in multiple formats

### Browse Options
- Browse by research categories
- Browse by publication year
- Browse by volume and issue
- Browse by author profiles
- Recent publications showcase

## 📊 Analytics & Metrics

### Article Metrics
- **View Counts**: Article page visits
- **Download Statistics**: PDF download tracking
- **Citation Tracking**: Reference and citation monitoring
- **Geographic Analytics**: Reader location data
- **Temporal Analysis**: Access patterns over time


## 🛠️ Technical Features

### Architecture
- **Next.js 13+**: Modern React framework with App Router
- **MongoDB**: Document database for flexible data storage
- **NextAuth.js**: Secure authentication system
- **Cloudinary**: Image and file management
- **SCSS Modules**: Modular styling system

### Security Features
- **Role-based Access Control**: Granular permission system
- **Secure File Upload**: Virus scanning and type validation
- **Data Encryption**: Sensitive data protection
- **Session Management**: Secure user session handling
- **CSRF Protection**: Cross-site request forgery prevention


## 📱 Responsive Design

### Mobile-First Approach
- **Responsive Layout**: Optimized for all screen sizes
- **Touch-Friendly Interface**: Mobile gesture support
- **Progressive Web App**: Offline functionality
- **Fast Loading**: Optimized for mobile networks
- **Accessible Design**: WCAG compliance

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB database
- Google OAuth credentials
- Stripe account (for payments)
- Cloudinary account (for file storage)

### Environment Variables
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/journal
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-public-key
STRIPE_SECRET_KEY=your-stripe-secret-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

### Installation Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Initialize database: `npm run init-db`
5. Start development server: `npm run dev`
6. Access application at `http://localhost:3000`

## 📚 User Guides

### For Authors
1. **Registration**: Sign up using Google account
2. **Profile Setup**: Complete profile with ORCID and affiliation
3. **Manuscript Submission**: Use step-by-step submission wizard
4. **Track Progress**: Monitor manuscript status in dashboard
5. **Respond to Reviews**: Submit revisions when requested
6. **Payment**: Complete publication fees when accepted

### For Reviewers
1. **Accept Invitations**: Respond to review requests promptly
2. **Download Materials**: Access manuscript files securely
3. **Complete Reviews**: Provide thorough, constructive feedback
4. **Meet Deadlines**: Submit reviews within specified timeframes
5. **Maintain Confidentiality**: Respect double-blind review process

### For Editors
1. **Manuscript Screening**: Review submissions for scope and quality
2. **Reviewer Assignment**: Select appropriate reviewers by expertise
3. **Monitor Progress**: Track review completion and deadlines
4. **Make Decisions**: Provide clear, justified editorial decisions
5. **Manage Workflow**: Coordinate between authors, reviewers, and copy editors


### Code Structure
- `/src/app`: Next.js app router pages
- `/src/components`: Reusable React components
- `/src/lib`: Utility functions and configurations
- `/src/models`: MongoDB schema definitions
- `/src/types`: TypeScript type definitions

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.



---

**Global Journal of Advanced Technology** - Empowering researchers worldwide to share groundbreaking discoveries and innovations in technology and science.
```

