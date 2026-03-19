import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

const SampleComponent = () => <div>Hello Test</div>;

describe('Sample Component', () => {
    it('renders heading', () => {
        render(<SampleComponent />);
        expect(screen.getByText('Hello Test')).toBeInTheDocument();
    });
});
