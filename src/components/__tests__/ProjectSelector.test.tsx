
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useAuth } from '@/context/auth-context';
import { ProjectContext } from '@/contexts/ProjectContext';
import { fetchProjectsAction } from '@/app/actions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/app/actions', () => ({
  fetchProjectsAction: jest.fn(),
}));

const mockSetSelectedProject = jest.fn();

// Helper to render with providers
const renderWithProviders = (component: React.ReactNode, project: any = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Prevent retries in tests
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectContext.Provider value={{ selectedProject: project, setSelectedProject: mockSetSelectedProject, searchTerm: '', setSearchTerm: jest.fn(), activeSearch: '', setActiveSearch: jest.fn() }}>
        {component}
      </ProjectContext.Provider>
    </QueryClientProvider>
  );
};

describe('ProjectSelector Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ credentials: { jiraUrl: 'https://test.jira.com', email: 'test@user.com', apiToken: 'token' } });
    (fetchProjectsAction as jest.Mock).mockClear();
    mockSetSelectedProject.mockClear();
  });

  it('shows a loading skeleton while fetching projects', () => {
    (fetchProjectsAction as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderWithProviders(<ProjectSelector />);
    // Check for the skeleton, which is rendered during the initial loading state.
    const skeleton = screen.getByRole('button').querySelector('.h-10.w-\\[250px\\].bg-muted');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows an error message if fetching projects fails', async () => {
    const errorMessage = 'Failed to connect';
    (fetchProjectsAction as jest.Mock).mockRejectedValue(new Error(errorMessage));
    renderWithProviders(<ProjectSelector />);
    
    expect(await screen.findByText('Error Fetching Projects')).toBeInTheDocument();
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('renders projects and allows selection', async () => {
    const mockProjects = [
      { id: '1', key: 'PROJ1', name: 'Project One' },
      { id: '2', key: 'PROJ2', name: 'Project Two' },
    ];
    (fetchProjectsAction as jest.Mock).mockResolvedValue(mockProjects);
    renderWithProviders(<ProjectSelector />);

    const triggerButton = await screen.findByRole('button', { name: /select a project/i });
    fireEvent.click(triggerButton);

    const projectOne = await screen.findByText('Project One (PROJ1)');
    const projectTwo = await screen.findByText('Project Two (PROJ2)');
    expect(projectOne).toBeInTheDocument();
    expect(projectTwo).toBeInTheDocument();

    fireEvent.click(projectOne);

    await waitFor(() => {
        expect(mockSetSelectedProject).toHaveBeenCalledWith(mockProjects[0]);
    });
    
    // The button text should update after selection
    expect(await screen.findByRole('button', {name: /Project One \(PROJ1\)/i})).toBeInTheDocument();
  });
  
  it('displays "No projects found" when the API returns an empty array', async () => {
      (fetchProjectsAction as jest.Mock).mockResolvedValue([]);
      renderWithProviders(<ProjectSelector />);
      
      expect(await screen.findByText('No Projects Found')).toBeInTheDocument();
  });
});
