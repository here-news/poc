import axios from 'axios';
import { ENV } from 'lib/env';
import React , { useState, useRef, useCallback, useEffect} from 'react'
import { useInfiniteQuery, useQueryClient, useQuery } from 'react-query'
import { IPost } from 'types/interfaces';

import Input from './Input'
import MinifiedPost from './pages/home/MinifiedPost';
import { BiLoaderAlt } from 'react-icons/bi';

interface SearchModalProps {
}

const SearchModal = ({} : SearchModalProps) => {
    const limit = 5;

    const [visible, setVisible] = useState(false)
    const [focused, setFocused] = useState(false)
    const [ptInRect, setPtInRect] = useState(false)

    const [searchKey, setSearchKey]  = useState('')

    const observerElem = useRef(null)
    const queryClient = useQueryClient()

    const handleSearchKey = (value: string) => { 
        // eslint-disable-next-line no-console
        queryClient.invalidateQueries('getSearchedPosts')
        setSearchKey(value)
     }
    
    const toggleEvent = () => {
        setFocused(true)
    }

    const blurEvent = () => {
        setFocused(false)
    }

    const fetchExplorePosts = async (page: Number, searchKey:string) => {
        const response = await axios.get(
          `${ENV.API_URL}/getSearchPosts?per_page=${limit}&page=${page}&search=${searchKey}`
        )
        return {
          result: response.data.data
        }
    }
    
    const {
        data,
        isSuccess,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        refetch
    } = useInfiniteQuery(
        'getSearchedPosts',
        ({ pageParam = 1 }) => fetchExplorePosts(pageParam, searchKey),
        {
            getNextPageParam: (lastPage, allPages) => {
                const nextPage: number = allPages.length + 1
                return lastPage.result.length === limit ? nextPage : undefined
            }
        }
    )
    
    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            // eslint-disable-next-line no-console
            console.log('here')
            const [target] = entries
            if (target.isIntersecting && hasNextPage) {
                fetchNextPage()
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [fetchNextPage, hasNextPage, searchKey]
    )
    
    useEffect(() => {
        if (!observerElem.current) return
        const element: HTMLDivElement = observerElem.current
        const option = { threshold: 0 }
    
        const observer = new IntersectionObserver(handleObserver, option)
        observer.observe(element)
        return () => observer.unobserve(element)
    }, [fetchNextPage, hasNextPage, handleObserver, searchKey])

    useEffect(() => {
        if(ptInRect) return ;
        setVisible(focused)
    }, [focused])

    return (
        <div className='relative'>
           <Input
                onKeyUp={() => {
                    refetch()
                }}
                onChange={(value) => {
                    handleSearchKey(value)
                }}
                value={searchKey}
                placeholder='Enter Search Key'
                type='text'
                inputClassName='rounded-none placeholder:text-[#666]'
                inputProps={{
                  maxLength: 120
                }}
                onFocus={() => toggleEvent()}
                onBlur={() => blurEvent()}
            />
            <div 
                className='absolute z-10 border-[black] border-[1px] w-[300px] max-h-[400px] overflow-y-auto bg-white pt-2 pl-1 pr-1'
                style={{
                    display: (visible && searchKey) ? 'block' : 'none'
                }}
                onMouseOver={() => {
                    setPtInRect(true)
                }}
                onMouseOut={() => {
                    setPtInRect(false)
                }}
            >
                {searchKey && isSuccess &&
                    data &&
                    data.pages &&
                    data.pages.map(
                    (page, pageIndex) =>
                        page &&
                        page.result &&
                        (page.result.length ? page.result.map((post: IPost, i: number) => {
                            const newIndex = pageIndex * limit + i
                            return (
                                // eslint-disable-next-line no-console
                                <div key={post._id} className='w-full mb-2'>
                                    <MinifiedPost
                                        noInteraction = {true}
                                        {...post}
                                        index={newIndex + 1}
                                        clickPost={() => setVisible(false)}
                                    />
                                </div>
                            )
                        }) : <div className='w-full flex items-center justify-center pb-2' key={'not_found_id'}>No Found</div>
                        )
                )}
                {hasNextPage && (
                    <div className='my-4 w-full z-[1] loader' ref={observerElem}>
                    <div className='flex items-center justify-center z-[1]'>
                        <p className='text-white text-sm bg-black px-3 py-2 rounded-lg font-semibold flex flex-row items-center'>
                        {!isFetchingNextPage ? (
                            'Load more news...'
                        ) : (
                            <React.Fragment>
                            <span className='animate-spin rotate mr-2'>
                                <BiLoaderAlt color='white' />
                            </span>
                            Loading news...
                            </React.Fragment>
                        )}
                        </p>
                    </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SearchModal ;